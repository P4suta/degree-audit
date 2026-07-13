//! The single pure interpreter for the [`Requirement`] algebra.
//!
//! Every arm is a pure function of `(rule params, pool)`. No allocation state
//! (consumed ids) appears here — that lives only in the pipeline fold. This keeps
//! the tree a clean, stateless algebra.

use std::collections::HashMap;

use audit_text::match_key;

use crate::entity::academic_record::SharedCourse;
use crate::entity::course::Course;
use crate::value::{FieldCategory, Language, SubjectKind};

use super::requirement::{
    CoursePredicate, ElectiveParams, NamedSubject, PredicateCap, Requirement, Rule,
};
use super::result::{Diagnostic, EvalContext, ExcludedCourse, ExclusionReason, SpecResult, Unit};

/// Evaluate a requirement against a pool. The tree is stateless: sub-requirements
/// all see the same pool.
pub fn evaluate(req: &Requirement, ctx: &EvalContext) -> SpecResult {
    match &req.rule {
        Rule::MinCredits { required, over } => eval_min_credits(*required, over, ctx.pool),
        Rule::MinCreditsWithCaps {
            required,
            kinds,
            kind_caps,
            predicate_caps,
        } => eval_min_credits_with_caps(*required, kinds, kind_caps, predicate_caps, ctx.pool),
        Rule::CappedContribution { cap, over } => eval_capped_contribution(*cap, over, ctx.pool),
        Rule::MinKindsCovered {
            kinds,
            per_kind,
            kind_count,
            total_min,
        } => eval_min_kinds_covered(kinds, *per_kind, *kind_count, *total_min, ctx.pool),
        Rule::MinFieldsCovered {
            per_field,
            field_count,
        } => eval_min_fields_covered(*per_field, *field_count, ctx.pool),
        Rule::PerLanguageMin {
            per_language,
            language_count,
            allowed_languages,
            kinds,
        } => eval_per_language_min(
            *per_language,
            *language_count,
            allowed_languages.as_deref(),
            kinds,
            ctx.pool,
        ),
        Rule::RequireNamedSubjects { subjects } => eval_require_named_subjects(subjects, ctx.pool),
        Rule::Elective(params) => eval_elective(params, ctx.pool),
        Rule::Group { primary, subs } => eval_group(primary, subs, ctx),
        Rule::All(specs) => eval_all(specs, ctx),
    }
}

// --- helpers ---

fn total_credits(courses: &[SharedCourse]) -> u32 {
    courses.iter().map(|c| c.credit.get()).sum()
}

fn matches(pred: &CoursePredicate, course: &Course) -> bool {
    match pred {
        CoursePredicate::Always => true,
        CoursePredicate::KindIn { kinds } => kinds.contains(&course.kind()),
        CoursePredicate::Kind { kind } => course.kind() == *kind,
        CoursePredicate::SportsScience => is_sports_science(course),
    }
}

/// Detect スポーツ科学 lecture/practical courses.
fn is_sports_science(course: &Course) -> bool {
    let name_key = match_key(&course.name);
    if name_key.contains(&match_key("スポーツ科学講義"))
        || name_key.contains(&match_key("スポーツ科学実技"))
    {
        return true;
    }
    match_key(&course.raw_category_label).contains(&match_key("スポーツ科学"))
}

/// De-duplicate courses by id, preserving first-seen order.
fn unique_by_id(courses: Vec<SharedCourse>) -> Vec<SharedCourse> {
    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::new();
    for c in courses {
        if seen.insert(c.id.clone()) {
            out.push(c);
        }
    }
    out
}

// --- combinators ---

fn eval_min_credits(required: u32, over: &CoursePredicate, pool: &[SharedCourse]) -> SpecResult {
    let matching: Vec<SharedCourse> = pool.iter().filter(|c| matches(over, c)).cloned().collect();
    let actual = total_credits(&matching);
    SpecResult::new(actual >= required, required, actual)
        .with_contributing(matching)
        .with_diagnostics(vec![Diagnostic::Progress {
            actual,
            required,
            unit: Unit::Credit,
        }])
}

fn eval_capped_contribution(cap: u32, over: &CoursePredicate, pool: &[SharedCourse]) -> SpecResult {
    let matching: Vec<SharedCourse> = pool.iter().filter(|c| matches(over, c)).cloned().collect();
    let raw_total = total_credits(&matching);
    let mut capped = Vec::new();
    let mut accumulated = 0u32;
    for course in &matching {
        let credit = course.credit.get();
        if accumulated + credit <= cap {
            capped.push(course.clone());
            accumulated += credit;
        } else {
            break;
        }
    }
    // Always satisfied — this only limits how much flows into an aggregate.
    SpecResult::new(true, cap, accumulated)
        .with_contributing(capped)
        .with_diagnostics(vec![Diagnostic::Cap {
            label: predicate_label(over),
            cap,
            counted: accumulated,
            raw: raw_total,
        }])
}

fn eval_min_credits_with_caps(
    required: u32,
    kinds: &[SubjectKind],
    kind_caps: &[(SubjectKind, u32)],
    predicate_caps: &[PredicateCap],
    pool: &[SharedCourse],
) -> SpecResult {
    let cap_map: HashMap<SubjectKind, u32> = kind_caps.iter().copied().collect();
    let mut consumed_per_kind: HashMap<SubjectKind, u32> = HashMap::new();
    let mut raw_per_kind: HashMap<SubjectKind, u32> = HashMap::new();
    let mut consumed_per_pred: HashMap<&str, u32> = HashMap::new();
    let mut raw_per_pred: HashMap<&str, u32> = HashMap::new();
    let mut contributing = Vec::new();
    let mut actual = 0u32;

    for course in pool {
        let kind = course.kind();
        if !kinds.contains(&kind) {
            continue;
        }
        let credit = course.credit.get();
        *raw_per_kind.entry(kind).or_insert(0) += credit;
        let matching_pcs: Vec<&PredicateCap> = predicate_caps
            .iter()
            .filter(|pc| matches(&pc.over, course))
            .collect();
        for pc in &matching_pcs {
            *raw_per_pred.entry(pc.id.as_str()).or_insert(0) += credit;
        }
        if let Some(&kind_cap) = cap_map.get(&kind) {
            let consumed = *consumed_per_kind.get(&kind).unwrap_or(&0);
            if consumed + credit > kind_cap {
                continue;
            }
        }
        let predicate_cap_exceeded = matching_pcs.iter().any(|pc| {
            let consumed = *consumed_per_pred.get(pc.id.as_str()).unwrap_or(&0);
            consumed + credit > pc.cap
        });
        if predicate_cap_exceeded {
            continue;
        }
        if cap_map.contains_key(&kind) {
            *consumed_per_kind.entry(kind).or_insert(0) += credit;
        }
        for pc in &matching_pcs {
            *consumed_per_pred.entry(pc.id.as_str()).or_insert(0) += credit;
        }
        contributing.push(course.clone());
        actual += credit;
    }

    let mut diagnostics = vec![Diagnostic::Progress {
        actual,
        required,
        unit: Unit::Credit,
    }];
    for (kind, cap) in kind_caps {
        diagnostics.push(Diagnostic::Cap {
            label: kind.display_name().to_owned(),
            cap: *cap,
            counted: *consumed_per_kind.get(kind).unwrap_or(&0),
            raw: *raw_per_kind.get(kind).unwrap_or(&0),
        });
    }
    for pc in predicate_caps {
        diagnostics.push(Diagnostic::Cap {
            label: pc.label.clone(),
            cap: pc.cap,
            counted: *consumed_per_pred.get(pc.id.as_str()).unwrap_or(&0),
            raw: *raw_per_pred.get(pc.id.as_str()).unwrap_or(&0),
        });
    }

    SpecResult::new(actual >= required, required, actual)
        .with_contributing(contributing)
        .with_diagnostics(diagnostics)
}

fn eval_min_kinds_covered(
    kinds: &[SubjectKind],
    per_kind: u32,
    kind_count: u32,
    total_min: Option<u32>,
    pool: &[SharedCourse],
) -> SpecResult {
    let mut credits_by_kind: HashMap<SubjectKind, u32> = HashMap::new();
    let mut contributing = Vec::new();
    let mut total = 0u32;
    for course in pool {
        let kind = course.kind();
        if !kinds.contains(&kind) {
            continue;
        }
        *credits_by_kind.entry(kind).or_insert(0) += course.credit.get();
        total += course.credit.get();
        contributing.push(course.clone());
    }
    let covered = kinds
        .iter()
        .filter(|k| *credits_by_kind.get(k).unwrap_or(&0) >= per_kind)
        .count() as u32;
    let total_ok = total_min.is_none_or(|min| total >= min);
    let satisfied = covered >= kind_count && total_ok;

    let mut diagnostics = vec![Diagnostic::Progress {
        actual: covered,
        required: kind_count,
        unit: Unit::Field,
    }];
    if let Some(min) = total_min {
        diagnostics.push(Diagnostic::Total {
            actual: total,
            required: min,
        });
    }
    for kind in kinds {
        diagnostics.push(Diagnostic::KindCredits {
            kind: *kind,
            credits: *credits_by_kind.get(kind).unwrap_or(&0),
        });
    }

    SpecResult::new(satisfied, kind_count, covered)
        .with_unit(Unit::Field)
        .with_contributing(contributing)
        .with_diagnostics(diagnostics)
}

fn eval_min_fields_covered(per_field: u32, field_count: u32, pool: &[SharedCourse]) -> SpecResult {
    let mut credits_by_field: HashMap<FieldCategory, u32> = HashMap::new();
    let mut contributing = Vec::new();
    for course in pool {
        if let Some(field) = course.category.field() {
            *credits_by_field.entry(field).or_insert(0) += course.credit.get();
            contributing.push(course.clone());
        }
    }
    let covered = FieldCategory::ALL
        .iter()
        .filter(|f| *credits_by_field.get(f).unwrap_or(&0) >= per_field)
        .count() as u32;

    let mut diagnostics = vec![Diagnostic::Progress {
        actual: covered,
        required: field_count,
        unit: Unit::Field,
    }];
    for field in FieldCategory::ALL {
        diagnostics.push(Diagnostic::FieldCredits {
            field,
            credits: *credits_by_field.get(&field).unwrap_or(&0),
        });
    }

    SpecResult::new(covered >= field_count, field_count, covered)
        .with_unit(Unit::Field)
        .with_contributing(contributing)
        .with_diagnostics(diagnostics)
}

fn eval_per_language_min(
    per_language: u32,
    language_count: u32,
    allowed_languages: Option<&[Language]>,
    kinds: &[SubjectKind],
    pool: &[SharedCourse],
) -> SpecResult {
    // Insertion-ordered accumulation.
    let mut credits_by_lang: Vec<(Language, u32)> = Vec::new();
    let mut excluded_by_lang: Vec<(Language, u32)> = Vec::new();
    let mut contributing = Vec::new();

    for course in pool {
        if !kinds.contains(&course.kind()) {
            continue;
        }
        let Some(lang) = course.category.language() else {
            continue;
        };
        let credit = course.credit.get();
        let allowed = allowed_languages.is_none_or(|set| set.contains(&lang));
        if allowed {
            add_credit(&mut credits_by_lang, lang, credit);
            contributing.push(course.clone());
        } else {
            add_credit(&mut excluded_by_lang, lang, credit);
        }
    }

    let qualified = credits_by_lang
        .iter()
        .filter(|(_, c)| *c >= per_language)
        .count() as u32;

    let mut diagnostics = vec![Diagnostic::Progress {
        actual: qualified,
        required: language_count,
        unit: Unit::Language,
    }];
    for (lang, credits) in &credits_by_lang {
        diagnostics.push(Diagnostic::LanguageCredits {
            language: *lang,
            credits: *credits,
            allowed: true,
        });
    }
    for (lang, credits) in &excluded_by_lang {
        diagnostics.push(Diagnostic::LanguageCredits {
            language: *lang,
            credits: *credits,
            allowed: false,
        });
    }

    SpecResult::new(qualified >= language_count, language_count, qualified)
        .with_unit(Unit::Language)
        .with_contributing(contributing)
        .with_diagnostics(diagnostics)
}

fn add_credit(acc: &mut Vec<(Language, u32)>, lang: Language, credit: u32) {
    if let Some(entry) = acc.iter_mut().find(|(l, _)| *l == lang) {
        entry.1 += credit;
    } else {
        acc.push((lang, credit));
    }
}

fn eval_require_named_subjects(subjects: &[NamedSubject], pool: &[SharedCourse]) -> SpecResult {
    let mut sub_results = Vec::new();
    let mut contributing = Vec::new();
    let mut acquired = 0u32;

    for subject in subjects {
        let key = match_key(&subject.key);
        let matched: Vec<SharedCourse> = pool
            .iter()
            .filter(|c| match_key(&c.name).contains(&key))
            .cloned()
            .collect();
        let credits = total_credits(&matched);
        let has_any = !matched.is_empty();
        if has_any {
            contributing.extend(matched.iter().cloned());
            acquired += 1;
        }
        sub_results.push(
            SpecResult::new(has_any, 1, u32::from(has_any))
                .with_contributing(matched)
                .with_diagnostics(vec![Diagnostic::SubjectStatus {
                    display: subject.display.clone(),
                    acquired: has_any,
                    credits,
                }]),
        );
    }

    let required = subjects.len() as u32;
    SpecResult::new(acquired == required, required, acquired)
        .with_unit(Unit::Subject)
        .with_contributing(contributing)
        .with_sub_results(sub_results)
        .with_diagnostics(vec![Diagnostic::Progress {
            actual: acquired,
            required,
            unit: Unit::Subject,
        }])
}

fn frame_priority(kind: SubjectKind) -> u8 {
    match kind {
        SubjectKind::ElectiveOtherFaculty => 0,
        SubjectKind::ElectiveOtherCourse => 1,
        _ => 2, // platform/* overflow
    }
}

fn eval_elective(params: &ElectiveParams, pool: &[SharedCourse]) -> SpecResult {
    let mut non_frame = Vec::new();
    let mut frame_candidates = Vec::new();
    let mut disallowed: Vec<(SubjectKind, u32)> = Vec::new();

    for course in pool {
        let kind = course.kind();
        if params.upstream_handled_kinds.contains(&kind) {
            continue;
        }
        if !params.allowed_kinds.contains(&kind) {
            add_kind_credit(&mut disallowed, kind, course.credit.get());
            continue;
        }
        if params.frame_kinds.contains(&kind) {
            frame_candidates.push(course.clone());
        } else {
            non_frame.push(course.clone());
        }
    }

    // Stable sort by frame priority (preserves pool order within a priority).
    frame_candidates.sort_by_key(|c| frame_priority(c.kind()));

    let mut contributing = Vec::new();
    let mut excluded = Vec::new();
    let mut actual = 0u32;
    let mut frame_used = 0u32;
    let mut other_faculty_used = 0u32;

    // 1. Non-frame kinds count unconditionally.
    for course in &non_frame {
        actual += course.credit.get();
        contributing.push(course.clone());
    }

    // 2. Frame kinds, priority order, honoring both caps.
    for course in &frame_candidates {
        let credit = course.credit.get();
        let kind = course.kind();
        if kind == SubjectKind::ElectiveOtherFaculty
            && other_faculty_used + credit > params.other_faculty_cap
        {
            excluded.push(ExcludedCourse {
                course: course.clone(),
                reason: ExclusionReason::OtherFacultyCapExceeded {
                    cap: params.other_faculty_cap,
                },
            });
            continue;
        }
        if frame_used + credit > params.frame_cap {
            excluded.push(ExcludedCourse {
                course: course.clone(),
                reason: ExclusionReason::FrameCapExceeded {
                    cap: params.frame_cap,
                },
            });
            continue;
        }
        contributing.push(course.clone());
        actual += credit;
        frame_used += credit;
        if kind == SubjectKind::ElectiveOtherFaculty {
            other_faculty_used += credit;
        }
    }

    let mut diagnostics = vec![
        Diagnostic::Progress {
            actual,
            required: params.required,
            unit: Unit::Credit,
        },
        Diagnostic::Frame {
            label: "他学部科目".to_owned(),
            used: other_faculty_used,
            cap: params.other_faculty_cap,
        },
        Diagnostic::Frame {
            label: "他コース + 他学部 + PF 超過 枠".to_owned(),
            used: frame_used,
            cap: params.frame_cap,
        },
    ];
    for (kind, credits) in &disallowed {
        diagnostics.push(Diagnostic::KindCredits {
            kind: *kind,
            credits: *credits,
        });
    }

    SpecResult::new(actual >= params.required, params.required, actual)
        .with_contributing(contributing)
        .with_excluded(excluded)
        .with_diagnostics(diagnostics)
}

fn add_kind_credit(acc: &mut Vec<(SubjectKind, u32)>, kind: SubjectKind, credit: u32) {
    if let Some(entry) = acc.iter_mut().find(|(k, _)| *k == kind) {
        entry.1 += credit;
    } else {
        acc.push((kind, credit));
    }
}

fn eval_group(primary: &Requirement, subs: &[Requirement], ctx: &EvalContext) -> SpecResult {
    let primary_result = evaluate(primary, ctx);
    let sub_results: Vec<SpecResult> = subs.iter().map(|s| evaluate(s, ctx)).collect();
    let satisfied = primary_result.satisfied && sub_results.iter().all(|r| r.satisfied);

    let mut all_sub_results = Vec::with_capacity(1 + sub_results.len());
    all_sub_results.push(primary_result.clone());
    all_sub_results.extend(sub_results);

    SpecResult::new(satisfied, primary_result.required, primary_result.actual)
        .with_unit(primary_result.unit)
        .with_contributing(primary_result.contributing.clone())
        .with_diagnostics(primary_result.diagnostics.clone())
        .with_sub_results(all_sub_results)
}

fn eval_all(specs: &[Requirement], ctx: &EvalContext) -> SpecResult {
    let sub_results: Vec<SpecResult> = specs.iter().map(|s| evaluate(s, ctx)).collect();
    let required = sub_results.len() as u32;
    let actual = sub_results.iter().filter(|r| r.satisfied).count() as u32;
    let satisfied = sub_results.iter().all(|r| r.satisfied);
    let contributing = unique_by_id(
        sub_results
            .iter()
            .flat_map(|r| r.contributing.iter().cloned())
            .collect(),
    );
    SpecResult::new(satisfied, required, actual)
        .with_unit(Unit::Requirement)
        .with_contributing(contributing)
        .with_sub_results(sub_results)
}

/// A short label describing a predicate, for cap diagnostics.
fn predicate_label(pred: &CoursePredicate) -> String {
    match pred {
        CoursePredicate::Kind { kind } => kind.display_name().to_owned(),
        CoursePredicate::SportsScience => "スポーツ科学".to_owned(),
        CoursePredicate::KindIn { .. } | CoursePredicate::Always => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use crate::entity::course::{Course, CourseInput};
    use crate::value::{CourseId, Credit, FieldCategory, Grade, Language, SubjectCategory};

    use super::super::requirement::{ElectiveParams, PredicateCap, Requirement};
    use super::super::result::{EvalContext, ExclusionReason};
    use super::*;

    /// Build a passing course with an explicit category. The name doubles as the id.
    fn c(name: &str, credit: u32, category: SubjectCategory) -> SharedCourse {
        Arc::new(
            Course::of(CourseInput {
                id: CourseId::of(name).unwrap(),
                name: name.to_owned(),
                credit: Credit::new(credit),
                grade: Grade::Yu,
                category,
                raw_category_label: String::new(),
                year: None,
                teacher: None,
                score: None,
            })
            .unwrap(),
        )
    }

    fn eval(req: &Requirement, pool: &[SharedCourse]) -> SpecResult {
        evaluate(req, &EvalContext::new(pool))
    }

    fn ids(result: &SpecResult) -> Vec<String> {
        result.contributing.iter().map(|c| c.name.clone()).collect()
    }

    // --- min_credits / min_credits_in_category ---

    #[test]
    fn min_credits_boundary_is_inclusive() {
        let req =
            Requirement::min_credits_in_category("x", "x", 4, vec![SubjectKind::CommonPrimary]);
        let below = [c("a", 2, SubjectCategory::CommonPrimary)];
        let exact = [
            c("a", 2, SubjectCategory::CommonPrimary),
            c("b", 2, SubjectCategory::CommonPrimary),
        ];
        let r_below = eval(&req, &below);
        assert!(!r_below.satisfied);
        assert_eq!(r_below.actual, 2);
        let r = eval(&req, &exact);
        assert!(r.satisfied);
        assert_eq!(r.actual, 4);
        // Courses of other kinds do not contribute.
        let mixed = [
            c("a", 2, SubjectCategory::CommonPrimary),
            c("z", 8, SubjectCategory::ElectiveOwnCourse),
        ];
        assert_eq!(eval(&req, &mixed).actual, 2);
    }

    // --- min_kinds_covered ---

    #[test]
    fn min_kinds_covered_counts_covered_kinds_and_total() {
        let kinds = vec![
            SubjectKind::LiberalGroupLife,
            SubjectKind::LiberalGroupArts,
            SubjectKind::LiberalGroupComplex,
        ];
        let req = Requirement::min_kinds_covered("x", "x", kinds, 2, 2, Some(8));

        // Two kinds each reach 2 credits (covered=2), total=8 → satisfied.
        let pool = [
            c("l1", 1, SubjectCategory::LiberalGroupLife),
            c("l2", 1, SubjectCategory::LiberalGroupLife), // Life = 2 (accumulates)
            c("a1", 2, SubjectCategory::LiberalGroupArts), // Arts = 2
            c("x1", 4, SubjectCategory::LiberalGroupComplex), // Complex = 4 but only 1 more kind
        ];
        let r = eval(&req, &pool);
        assert_eq!(r.actual, 3, "all three kinds reach the 2-credit floor");
        assert_eq!(r.required, 2);
        assert!(r.satisfied);

        // Covered kinds meet the count, but total credits fall short → not satisfied.
        let low_total = [
            c("l1", 1, SubjectCategory::LiberalGroupLife),
            c("l2", 1, SubjectCategory::LiberalGroupLife),
            c("a1", 2, SubjectCategory::LiberalGroupArts),
        ];
        let r = eval(&req, &low_total);
        assert_eq!(r.actual, 2);
        assert!(
            !r.satisfied,
            "total 4 < 8 gate must fail even with 2 kinds covered"
        );
    }

    // --- per_language_min ---

    #[test]
    fn per_language_min_sums_per_language_and_filters_allowed() {
        let req = Requirement::per_language_min(
            "x",
            "x",
            4,
            1,
            Some(vec![Language::Chinese]),
            vec![SubjectKind::LiberalForeignLanguage],
        );
        // Chinese accumulates 1+3=4 (qualifies via summation, not product);
        // German is not in the allowed set.
        let pool = [
            c(
                "cn1",
                1,
                SubjectCategory::LiberalForeignLanguage {
                    language: Language::Chinese,
                },
            ),
            c(
                "cn2",
                3,
                SubjectCategory::LiberalForeignLanguage {
                    language: Language::Chinese,
                },
            ),
            c(
                "de1",
                4,
                SubjectCategory::LiberalForeignLanguage {
                    language: Language::German,
                },
            ),
        ];
        let r = eval(&req, &pool);
        assert_eq!(r.actual, 1, "one language qualifies");
        assert!(r.satisfied);
        assert_eq!(
            ids(&r),
            vec!["cn1", "cn2"],
            "German excluded as not-allowed"
        );

        // Only 1 Chinese credit → below the per-language floor.
        let short = [c(
            "cn1",
            1,
            SubjectCategory::LiberalForeignLanguage {
                language: Language::Chinese,
            },
        )];
        assert!(!eval(&req, &short).satisfied);
    }

    // --- capped_contribution ---

    #[test]
    fn capped_contribution_truncates_and_is_always_satisfied() {
        let req = Requirement::capped_contribution(
            "x",
            "x",
            6,
            CoursePredicate::Kind {
                kind: SubjectKind::LiberalCareer,
            },
        );
        let pool = [
            c("k1", 2, SubjectCategory::LiberalCareer),
            c("k2", 2, SubjectCategory::LiberalCareer),
            c("k3", 2, SubjectCategory::LiberalCareer),
            c("k4", 2, SubjectCategory::LiberalCareer), // beyond the cap
        ];
        let r = eval(&req, &pool);
        assert!(r.satisfied, "capped contribution is always satisfied");
        assert_eq!(r.actual, 6, "capped at 6");
        assert_eq!(ids(&r), vec!["k1", "k2", "k3"]);
    }

    // --- min_credits_with_caps ---

    #[test]
    fn min_credits_with_caps_applies_kind_and_predicate_caps() {
        let req = Requirement::min_credits_with_caps(
            "x",
            "x",
            10,
            vec![SubjectKind::LiberalField, SubjectKind::LiberalCareer],
            vec![(SubjectKind::LiberalCareer, 6)],
            vec![PredicateCap {
                id: "sports".to_owned(),
                label: "スポーツ科学".to_owned(),
                over: CoursePredicate::SportsScience,
                cap: 4,
            }],
        );
        let field = |n: &str| {
            c(
                n,
                2,
                SubjectCategory::LiberalField {
                    field: FieldCategory::Humanities,
                },
            )
        };
        let career = |n: &str| c(n, 2, SubjectCategory::LiberalCareer);
        let pool = [
            career("ca1"),
            career("ca2"),
            career("ca3"),
            career("ca4"), // career raw 8, capped at 6
            c(
                "スポーツ科学講義1",
                2,
                SubjectCategory::LiberalField {
                    field: FieldCategory::Humanities,
                },
            ),
            c(
                "スポーツ科学講義2",
                2,
                SubjectCategory::LiberalField {
                    field: FieldCategory::Humanities,
                },
            ),
            c(
                "スポーツ科学講義3",
                2,
                SubjectCategory::LiberalField {
                    field: FieldCategory::Humanities,
                },
            ), // sports raw 6, capped at 4
            field("f1"),
        ];
        let r = eval(&req, &pool);
        // career: 6 (cap) + sports fields: 4 (cap) + plain field f1: 2 = 12.
        assert_eq!(r.actual, 12);
        assert!(r.satisfied);
    }

    // --- elective ---

    fn elective_params(required: u32, other_faculty_cap: u32, frame_cap: u32) -> ElectiveParams {
        ElectiveParams {
            required,
            allowed_kinds: vec![
                SubjectKind::ElectiveOwnCourse,
                SubjectKind::ElectiveOtherCourse,
                SubjectKind::ElectiveOtherFaculty,
            ],
            upstream_handled_kinds: vec![SubjectKind::Seminar56Thesis],
            other_faculty_cap,
            frame_kinds: vec![
                SubjectKind::ElectiveOtherCourse,
                SubjectKind::ElectiveOtherFaculty,
            ],
            frame_cap,
        }
    }

    #[test]
    fn elective_counts_non_frame_unconditionally() {
        let req = Requirement::elective("x", "x", elective_params(4, 8, 16));
        let pool = [
            c("own1", 2, SubjectCategory::ElectiveOwnCourse),
            c("own2", 2, SubjectCategory::ElectiveOwnCourse),
            // upstream-handled kind is ignored, not disallowed:
            c("thesis", 8, SubjectCategory::Seminar56Thesis),
        ];
        let r = eval(&req, &pool);
        assert_eq!(r.actual, 4);
        assert!(r.satisfied);
        assert!(r.excluded.is_empty());
    }

    #[test]
    fn elective_enforces_other_faculty_cap_with_exclusion() {
        let req = Requirement::elective("x", "x", elective_params(2, 4, 16));
        let pool = [
            c("of1", 2, SubjectCategory::ElectiveOtherFaculty),
            c("of2", 2, SubjectCategory::ElectiveOtherFaculty),
            c("of3", 2, SubjectCategory::ElectiveOtherFaculty), // exceeds the 4-credit cap
        ];
        let r = eval(&req, &pool);
        assert_eq!(r.actual, 4, "only 4 of 6 other-faculty credits count");
        assert_eq!(r.excluded.len(), 1);
        assert!(matches!(
            r.excluded[0].reason,
            ExclusionReason::OtherFacultyCapExceeded { cap: 4 }
        ));
    }

    #[test]
    fn elective_prioritizes_other_faculty_into_a_tight_frame() {
        // Frame cap only fits one 2-credit course. Priority must take the
        // other-faculty course first (priority 0) over the other-course (priority 1).
        let req = Requirement::elective("x", "x", elective_params(2, 8, 2));
        let pool = [
            // pool order deliberately puts other-course first to prove sorting matters.
            c("oc1", 2, SubjectCategory::ElectiveOtherCourse),
            c("of1", 2, SubjectCategory::ElectiveOtherFaculty),
        ];
        let r = eval(&req, &pool);
        assert_eq!(r.actual, 2);
        assert_eq!(ids(&r), vec!["of1"], "other-faculty wins the tight frame");
        assert_eq!(r.excluded.len(), 1);
        assert!(matches!(
            r.excluded[0].reason,
            ExclusionReason::FrameCapExceeded { cap: 2 }
        ));
    }

    // --- group / all ---

    #[test]
    fn group_requires_primary_and_every_sub() {
        let primary =
            Requirement::min_credits_in_category("p", "p", 2, vec![SubjectKind::CommonPrimary]);
        let failing_sub =
            Requirement::min_credits_in_category("s", "s", 4, vec![SubjectKind::CommonPrimary]);
        let req = Requirement::group("g", "g", primary, vec![failing_sub]);
        let pool = [c("a", 2, SubjectCategory::CommonPrimary)];
        let r = eval(&req, &pool);
        // Primary is satisfied (2/2) but the sub needs 4 → group must fail.
        assert_eq!(r.actual, 2, "outer numbers reflect the primary");
        assert!(!r.satisfied, "a failing sub fails the group");
        assert_eq!(r.sub_results.len(), 2, "primary + one sub");
    }

    #[test]
    fn all_of_counts_satisfied_subrequirements() {
        let ok =
            Requirement::min_credits_in_category("a", "a", 2, vec![SubjectKind::CommonPrimary]);
        let bad =
            Requirement::min_credits_in_category("b", "b", 4, vec![SubjectKind::CommonPrimary]);
        let req = Requirement::all_of("all", "all", vec![ok, bad]);
        let pool = [c("a", 2, SubjectCategory::CommonPrimary)];
        let r = eval(&req, &pool);
        assert_eq!(r.required, 2, "two sub-requirements");
        assert_eq!(r.actual, 1, "one satisfied");
        assert!(!r.satisfied);
        assert_eq!(r.unit, Unit::Requirement);
        // Contributing courses are gathered (de-duplicated) from the sub-results.
        assert_eq!(
            ids(&r),
            vec!["a"],
            "the single primary course flows up, once"
        );
    }
}
