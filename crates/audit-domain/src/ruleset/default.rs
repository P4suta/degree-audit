//! The default rule set: 令和2〜5年度 (2020–2023) 人文科学コース.
//! Ported from `rulesets/default/{metadata,category-map,requirements,predicates}.ts`.
//!
//! This is the rule set that applies to the sample transcript (2022 matriculation).

use audit_text::match_key;

use crate::allocation::{Step, Strategy};
use crate::entity::student_profile::StudentProfile;
use crate::spec::requirement::{
    CoursePredicate, ElectiveParams, NamedSubject, PredicateCap, Requirement,
};
use crate::value::{FieldCategory, Language, SubjectCategory, SubjectKind};

use super::{CategoryLookup, CategoryMap, RuleSet, RuleSetMetadata, RuleSetScope};

const MATRICULATION_MIN: u16 = 2020;
const MATRICULATION_MAX: u16 = 2023;

fn applicable_to(profile: &StudentProfile) -> bool {
    (MATRICULATION_MIN..=MATRICULATION_MAX).contains(&profile.matriculation_year)
}

// --- category map (ported from default/category-map.ts) ---

fn language_from(label: &str, name: &str) -> Language {
    Language::from_normalized(name)
        .or_else(|| Language::from_normalized(label))
        .unwrap_or(Language::Unspecified)
}

/// Classify a normalized (label, name) pair. `None` means unknown.
fn classify(label: &str, name: &str) -> Option<SubjectCategory> {
    let has = |h: &str, n: &str| h.contains(n);

    // Seminar / thesis (common vocabulary).
    if has(label, "卒業論文")
        || has(name, "卒業論文")
        || (has(label, "ゼミ") && has(label, "v・vi"))
        || (has(name, "ゼミナール") && has(name, "v・vi"))
    {
        return Some(SubjectCategory::Seminar56Thesis);
    }
    if has(label, "ゼミ") && has(label, "iii") {
        if name.contains("演習iv") || name.ends_with("iv") {
            return Some(SubjectCategory::Seminar34Fall);
        }
        if name.contains("演習ii") || name.ends_with("ii") {
            return Some(SubjectCategory::Seminar34Fall);
        }
        return Some(SubjectCategory::Seminar34Spring);
    }
    if has(label, "ゼミ") {
        return Some(SubjectCategory::Seminar12);
    }

    // Common education / primary.
    if has(label, "共通教育") && has(label, "初年次") {
        return Some(SubjectCategory::CommonPrimary);
    }

    // Platform.
    if has(label, "プラット") && has(label, "基礎") && has(label, "a") {
        return Some(SubjectCategory::PlatformBasicA);
    }
    if has(label, "プラット") && has(label, "基礎") && has(label, "b") {
        return Some(SubjectCategory::PlatformBasicB);
    }
    if has(label, "プラット") && has(label, "外国語") {
        return Some(SubjectCategory::PlatformForeignLanguage);
    }
    if has(label, "プラット") && has(label, "発展") {
        return Some(SubjectCategory::PlatformAdvanced);
    }

    // Liberal education.
    if has(label, "教養") && (has(label, "外国語") || has(label, "語学")) {
        return Some(SubjectCategory::LiberalForeignLanguage {
            language: language_from(label, name),
        });
    }
    if has(label, "教養") && has(label, "キャリア") {
        return Some(SubjectCategory::LiberalCareer);
    }
    if has(label, "教養") && has(label, "人文") {
        return Some(SubjectCategory::LiberalField {
            field: FieldCategory::Humanities,
        });
    }
    if has(label, "教養") && has(label, "社会") {
        return Some(SubjectCategory::LiberalField {
            field: FieldCategory::Social,
        });
    }
    if has(label, "教養") && (has(label, "生命") || has(label, "医療") || has(label, "生医"))
    {
        return Some(SubjectCategory::LiberalField {
            field: FieldCategory::BioMedical,
        });
    }
    if has(label, "教養") && has(label, "自然") {
        return Some(SubjectCategory::LiberalField {
            field: FieldCategory::Natural,
        });
    }

    // Elective.
    if has(label, "他学部") || has(label, "他学科") || has(label, "単位互換") {
        return Some(SubjectCategory::ElectiveOtherFaculty);
    }
    if has(label, "他コース") {
        return Some(SubjectCategory::ElectiveOtherCourse);
    }
    if has(label, "選択科目")
        || has(label, "自コース")
        || has(label, "専門教育")
        || has(label, "専門科目")
    {
        return Some(SubjectCategory::ElectiveOwnCourse);
    }

    None
}

fn category_map(lookup: &CategoryLookup) -> SubjectCategory {
    let label = match_key(lookup.raw_label);
    if label.is_empty() {
        return SubjectCategory::Unknown {
            raw: lookup.raw_label.to_owned(),
        };
    }
    let name = match_key(lookup.course_name.unwrap_or(""));
    classify(&label, &name).unwrap_or(SubjectCategory::Unknown {
        raw: lookup.raw_label.to_owned(),
    })
}

pub const CATEGORY_MAP: CategoryMap = category_map;

// --- requirements (ported from default/requirements.ts) ---

fn primary_required_subjects() -> Vec<NamedSubject> {
    vec![
        NamedSubject::new("大学基礎論", "大学基礎論"),
        NamedSubject::new("大学英語入門", "大学英語入門 I・II"),
        NamedSubject::new("英会話", "英会話 I・II"),
        NamedSubject::new("情報処理", "情報処理"),
        NamedSubject::new("学問基礎論", "学問基礎論"),
        NamedSubject::new("課題探求実践セミナー", "課題探求実践セミナー"),
    ]
}

fn mandatory_foreign_languages() -> Vec<Language> {
    // ドイツ語・フランス語・中国語・韓国語・朝鮮語・スペイン語 (韓/朝 fold to Korean).
    vec![
        Language::German,
        Language::French,
        Language::Chinese,
        Language::Korean,
        Language::Spanish,
    ]
}

fn requirements() -> Vec<Step> {
    let primary = Requirement::group(
        "primary-12",
        "初年次科目（6 科目 × 2単位 = 12単位）",
        Requirement::min_credits_in_category(
            "primary-total-12",
            "初年次科目 合計 12単位",
            12,
            vec![SubjectKind::CommonPrimary],
        ),
        vec![Requirement::require_named_subjects(
            "primary-named",
            "初年次 6 科目（名称必修）",
            primary_required_subjects(),
        )],
    );

    let liberal = Requirement::group(
        "liberal",
        "教養科目（合計 28単位 + 分野・外国語・キャリア上限）",
        Requirement::min_credits_with_caps(
            "liberal-total-28",
            "教養 合計 28単位（キャリア形成支援は上限 6 単位、スポーツ科学は上限 4 単位まで算入）",
            28,
            vec![
                SubjectKind::LiberalField,
                SubjectKind::LiberalForeignLanguage,
                SubjectKind::LiberalCareer,
            ],
            vec![(SubjectKind::LiberalCareer, 6)],
            vec![PredicateCap {
                id: "sports-4".to_owned(),
                label: "スポーツ科学".to_owned(),
                over: CoursePredicate::SportsScience,
                cap: 4,
            }],
        ),
        vec![
            Requirement::min_fields_covered("liberal-fields-3", "教養 4分野のうち 3分野以上", 1, 3),
            Requirement::per_language_min(
                "liberal-language-4",
                "外国語 1言語につき 4単位以上（独/仏/中/韓/朝/西 のいずれか）",
                4,
                1,
                Some(mandatory_foreign_languages()),
                vec![SubjectKind::LiberalForeignLanguage],
            ),
            Requirement::capped_contribution(
                "liberal-career-cap-6",
                "キャリア形成支援（上限 6単位）",
                6,
                CoursePredicate::Kind {
                    kind: SubjectKind::LiberalCareer,
                },
            ),
        ],
    );

    let seminar12 = Requirement::min_credits_in_category(
        "seminar-12",
        "ゼミナール I・II 4単位",
        4,
        vec![SubjectKind::Seminar12],
    );
    let seminar34 = Requirement::group(
        "seminar-34",
        "ゼミナール III・IV 4単位（演習 I + 演習 II 各 2単位）",
        Requirement::min_credits_in_category(
            "seminar-34-total",
            "ゼミナール III・IV 合計 4単位",
            4,
            vec![SubjectKind::Seminar34Spring, SubjectKind::Seminar34Fall],
        ),
        vec![
            Requirement::min_credits_in_category(
                "seminar-34-spring",
                "演習 I（前期）2単位",
                2,
                vec![SubjectKind::Seminar34Spring],
            ),
            Requirement::min_credits_in_category(
                "seminar-34-fall",
                "演習 II（後期）2単位",
                2,
                vec![SubjectKind::Seminar34Fall],
            ),
        ],
    );
    let seminar56 = Requirement::min_credits_in_category(
        "seminar-56",
        "卒業論文・ゼミナール V・VI 8単位",
        8,
        vec![SubjectKind::Seminar56Thesis],
    );

    let platform = Requirement::group(
        "platform",
        "プラットフォーム（合計 30単位 + 内訳）",
        Requirement::min_credits_in_category(
            "platform-total-30",
            "PF 科目 合計 30単位",
            30,
            vec![
                SubjectKind::PlatformBasicA,
                SubjectKind::PlatformBasicB,
                SubjectKind::PlatformForeignLanguage,
                SubjectKind::PlatformAdvanced,
            ],
        ),
        vec![
            Requirement::min_credits_in_category(
                "platform-a",
                "PF 基礎科目 A 群 2単位",
                2,
                vec![SubjectKind::PlatformBasicA],
            ),
            Requirement::min_credits_in_category(
                "platform-b",
                "PF 基礎科目 B 群 2単位",
                2,
                vec![SubjectKind::PlatformBasicB],
            ),
            Requirement::min_credits_in_category(
                "platform-basics-6",
                "PF 基礎科目合計 6単位",
                6,
                vec![SubjectKind::PlatformBasicA, SubjectKind::PlatformBasicB],
            ),
            Requirement::min_credits_in_category(
                "platform-foreign-4",
                "PF 外国語 4単位",
                4,
                vec![SubjectKind::PlatformForeignLanguage],
            ),
            Requirement::min_credits_in_category(
                "platform-advanced-8",
                "PF 発展 8単位",
                8,
                vec![SubjectKind::PlatformAdvanced],
            ),
        ],
    );

    let elective = Requirement::elective(
        "elective-38",
        "選択科目 38単位（他コース + 他学部 + PF 超過は 16 単位枠、他学部 8 単位まで）",
        ElectiveParams {
            required: 38,
            allowed_kinds: vec![
                SubjectKind::ElectiveOwnCourse,
                SubjectKind::ElectiveOtherCourse,
                SubjectKind::ElectiveOtherFaculty,
                SubjectKind::Seminar12,
                SubjectKind::Seminar34Spring,
                SubjectKind::Seminar34Fall,
                SubjectKind::PlatformBasicA,
                SubjectKind::PlatformBasicB,
                SubjectKind::PlatformForeignLanguage,
                SubjectKind::PlatformAdvanced,
            ],
            upstream_handled_kinds: vec![
                SubjectKind::CommonPrimary,
                SubjectKind::LiberalField,
                SubjectKind::LiberalForeignLanguage,
                SubjectKind::LiberalCareer,
                SubjectKind::Seminar56Thesis,
            ],
            other_faculty_cap: 8,
            frame_kinds: vec![
                SubjectKind::ElectiveOtherCourse,
                SubjectKind::ElectiveOtherFaculty,
                SubjectKind::PlatformBasicA,
                SubjectKind::PlatformBasicB,
                SubjectKind::PlatformForeignLanguage,
                SubjectKind::PlatformAdvanced,
            ],
            frame_cap: 16,
        },
    );

    vec![
        Step::new(primary, Strategy::ConsumeAll),
        Step::new(liberal, Strategy::ConsumeAll),
        Step::new(seminar12, Strategy::ConsumeRequired),
        Step::new(seminar34, Strategy::ConsumeRequired),
        Step::new(seminar56, Strategy::ConsumeAll),
        Step::new(platform, Strategy::ConsumeRequired),
        Step::new(elective, Strategy::Observe),
    ]
}

fn total_requirement() -> Requirement {
    Requirement::min_credits(
        "total-124",
        "総修得単位 124単位",
        124,
        CoursePredicate::Always,
    )
}

fn thesis_eligibility() -> Requirement {
    Requirement::all_of(
        "thesis-eligibility",
        "卒業論文履修資格",
        vec![
            Requirement::require_named_subjects(
                "thesis-primary-named",
                "初年次 6 科目（名称必修）",
                primary_required_subjects(),
            ),
            Requirement::min_credits_in_category(
                "thesis-primary-total-12",
                "初年次科目 合計 12単位",
                12,
                vec![SubjectKind::CommonPrimary],
            ),
            Requirement::per_language_min(
                "thesis-language-4",
                "教養外国語 1言語につき 4単位以上（独/仏/中/韓/朝/西 のいずれか）",
                4,
                1,
                Some(mandatory_foreign_languages()),
                vec![SubjectKind::LiberalForeignLanguage],
            ),
            Requirement::min_credits_in_category(
                "thesis-seminar12-4",
                "ゼミナール I・II 4単位",
                4,
                vec![SubjectKind::Seminar12],
            ),
            Requirement::min_credits_in_category(
                "thesis-seminar34-spring",
                "演習 I（前期）2単位",
                2,
                vec![SubjectKind::Seminar34Spring],
            ),
            Requirement::min_credits_in_category(
                "thesis-seminar34-fall",
                "演習 II（後期）2単位",
                2,
                vec![SubjectKind::Seminar34Fall],
            ),
            Requirement::min_credits_in_category(
                "thesis-seminar34-total",
                "ゼミナール III・IV 合計 4単位",
                4,
                vec![SubjectKind::Seminar34Spring, SubjectKind::Seminar34Fall],
            ),
            Requirement::min_credits(
                "thesis-total-90",
                "総修得単位 90単位",
                90,
                CoursePredicate::Always,
            ),
        ],
    )
}

/// Build the default rule set.
pub fn rule_set() -> RuleSet {
    RuleSet {
        metadata: RuleSetMetadata {
            id: "humanities/2020-2023",
            display_name: "令和 2〜5 年度（2020〜2023 年度）入学生（人文科学コース）",
            source_revision: "履修案内 2026-04 抜粋",
            applicable_to,
            specificity: 100,
            applicable_scopes: vec![RuleSetScope {
                faculty: "人文社会科学部",
                course: "人文科学コース",
            }],
        },
        category_map: CATEGORY_MAP,
        requirements: requirements(),
        total_requirement: total_requirement(),
        thesis_eligibility: thesis_eligibility(),
        total_credits_required: 124,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shape_is_stable() {
        let rs = rule_set();
        assert_eq!(rs.requirements.len(), 7);
        assert_eq!(rs.total_credits_required, 124);
    }

    #[test]
    fn category_map_classifies_representative_labels() {
        let c = |label: &str, name: &str| {
            category_map(&CategoryLookup {
                raw_label: label,
                course_name: Some(name),
            })
        };
        assert_eq!(
            c("共通教育 / 初年次科目", "大学基礎論"),
            SubjectCategory::CommonPrimary
        );
        assert_eq!(
            c("共通教育 / 教養科目 / 人文分野", "歴史を考える").kind(),
            SubjectKind::LiberalField
        );
        assert_eq!(
            c(
                "共通教育 / プラットフォーム科目 / 基礎科目Ａ群",
                "哲学概論Ⅱ"
            ),
            SubjectCategory::PlatformBasicA
        );
        assert_eq!(
            c("選択科目 / 他学部専門科目", "会計学概論"),
            SubjectCategory::ElectiveOtherFaculty
        );
    }
}
