//! Human-readable Japanese rendering of an [`Assessment`].
//!
//! Two renderings share one structure: [`plain`] is the exact pre-colour text
//! (kept byte-stable for redirected / `--color=never` output and its snapshot
//! tests), and [`fancy`] layers colour, a summary panel, and progress bars on top
//! for interactive terminals.

use std::fmt::Write as _;

use audit_domain::assess::Assessment;
use audit_domain::spec::result::SpecResult;

use crate::diagnostic::format_diagnostic;
use crate::theme::{Palette, paint};
use crate::ui::panel::{self, Line};

/// Width of an inline requirement progress bar.
const BAR_WIDTH: usize = 12;

/// Header context printed above the requirement breakdown.
pub struct ReportHeader {
    pub faculty: String,
    pub course: String,
    pub matriculation_year: u16,
}

fn symbol(satisfied: bool) -> &'static str {
    if satisfied { "✔" } else { "✘" }
}

fn status_line(a: &Assessment) -> String {
    if a.graduatable {
        "✔ 卒業可能".to_owned()
    } else if a.tentative.as_ref().is_some_and(|t| t.graduatable) {
        "△ 履修中がすべて合格すれば卒業可能".to_owned()
    } else {
        let short = a
            .total_credits_required
            .saturating_sub(a.total_credits.get());
        if short > 0 {
            format!("✘ 未充足（総単位あと {short} 単位ほか）")
        } else {
            "✘ 未充足".to_owned()
        }
    }
}

fn progress(result: &SpecResult) -> String {
    format!(
        "{} / {} {}",
        result.actual,
        result.required,
        result.unit.token()
    )
}

/// Render the full assessment as a Japanese report, colourised per `palette`.
pub fn format_assessment(
    a: &Assessment,
    header: &ReportHeader,
    verbose: bool,
    palette: &Palette,
) -> String {
    if palette.enabled {
        fancy(a, header, verbose, palette)
    } else {
        plain(a, header, verbose)
    }
}

/// The pre-colour rendering. Kept byte-for-byte stable.
fn plain(a: &Assessment, header: &ReportHeader, verbose: bool) -> String {
    let mut out = String::new();

    let _ = writeln!(
        out,
        "{} {}（{}年度入学）",
        header.faculty, header.course, header.matriculation_year
    );
    let _ = writeln!(
        out,
        "修得 {} / {} 単位   {}",
        a.total_credits.get(),
        a.total_credits_required,
        status_line(a)
    );
    out.push('\n');

    out.push_str("■ 卒業要件\n");
    for step in &a.steps {
        let _ = writeln!(
            out,
            "  {} {}  {}",
            symbol(step.result.satisfied),
            step.label,
            progress(&step.result)
        );
        if verbose {
            render_details(&mut out, &step.result, 6);
        }
    }

    out.push('\n');
    let _ = writeln!(
        out,
        "■ 総修得単位  {} {}",
        symbol(a.total.satisfied),
        progress(&a.total)
    );
    let _ = writeln!(
        out,
        "■ 卒業論文履修資格  {}  {}",
        symbol(a.thesis_eligibility.satisfied),
        progress(&a.thesis_eligibility)
    );

    if !a.in_progress_courses.is_empty() {
        out.push('\n');
        let _ = writeln!(out, "■ 履修中（{} 単位）", a.in_progress_credits.get());
        for c in &a.in_progress_courses {
            let _ = writeln!(out, "  - {}（{} 単位）", c.name, c.credit.get());
        }
        if let Some(t) = &a.tentative {
            let _ = writeln!(
                out,
                "  → 履修中がすべて合格した場合: {}",
                if t.graduatable {
                    "卒業可能"
                } else {
                    "なお未充足"
                }
            );
        }
    }

    out
}

/// The interactive rendering: a summary panel, coloured badges, and bars.
fn fancy(a: &Assessment, header: &ReportHeader, verbose: bool, palette: &Palette) -> String {
    let badge_style = if a.graduatable {
        palette.success
    } else if a.tentative.as_ref().is_some_and(|t| t.graduatable) {
        palette.warn
    } else {
        palette.error
    };

    let summary = [
        Line::new().push(
            palette.heading,
            &format!(
                "{} {}（{}年度入学）",
                header.faculty, header.course, header.matriculation_year
            ),
        ),
        Line::new().push(badge_style, &status_line(a)),
        Line::new().push(palette.muted, "修得 ").push(
            palette.heading,
            &format!(
                "{} / {} 単位",
                a.total_credits.get(),
                a.total_credits_required
            ),
        ),
    ];
    let mut out = panel::panel(&summary, palette);

    out.push('\n');
    let _ = writeln!(out, "{}", paint(palette.heading, "■ 卒業要件"));
    for step in &a.steps {
        let _ = writeln!(
            out,
            "{}",
            requirement_line(&step.label, &step.result, palette)
        );
        if verbose {
            render_details(&mut out, &step.result, 6);
        }
    }

    out.push('\n');
    let _ = writeln!(
        out,
        "{}  {}",
        paint(palette.heading, "■ 総修得単位"),
        requirement_inline(&a.total, palette)
    );
    let _ = writeln!(
        out,
        "{}  {}",
        paint(palette.heading, "■ 卒業論文履修資格"),
        requirement_inline(&a.thesis_eligibility, palette)
    );

    if !a.in_progress_courses.is_empty() {
        out.push('\n');
        let _ = writeln!(
            out,
            "{}",
            paint(
                palette.heading,
                &format!("■ 履修中（{} 単位）", a.in_progress_credits.get())
            )
        );
        for c in &a.in_progress_courses {
            let _ = writeln!(
                out,
                "  {} {}（{} 単位）",
                paint(palette.muted, "-"),
                c.name,
                c.credit.get()
            );
        }
        if let Some(t) = &a.tentative {
            let verdict = if t.graduatable {
                paint(palette.success, "卒業可能")
            } else {
                paint(palette.warn, "なお未充足")
            };
            let _ = writeln!(out, "  → 履修中がすべて合格した場合: {verdict}");
        }
    }

    out
}

/// A requirement step line with a coloured symbol, progress bar, and count.
fn requirement_line(label: &str, r: &SpecResult, palette: &Palette) -> String {
    let style = if r.satisfied {
        palette.success
    } else {
        palette.error
    };
    format!(
        "  {} {}  {}  {}",
        paint(style, symbol(r.satisfied)),
        label,
        paint(style, &panel::bar(r.actual, r.required, BAR_WIDTH)),
        paint(palette.muted, &progress(r))
    )
}

/// An inline satisfied-symbol plus progress, for the standalone totals.
fn requirement_inline(r: &SpecResult, palette: &Palette) -> String {
    let style = if r.satisfied {
        palette.success
    } else {
        palette.error
    };
    format!(
        "{} {}",
        paint(style, symbol(r.satisfied)),
        paint(palette.muted, &progress(r))
    )
}

fn render_details(out: &mut String, result: &SpecResult, indent: usize) {
    let pad = " ".repeat(indent);
    for d in &result.diagnostics {
        let _ = writeln!(out, "{pad}{}", format_diagnostic(d));
    }
    for sub in &result.sub_results {
        let _ = writeln!(out, "{pad}{} {}", symbol(sub.satisfied), progress(sub));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use audit_domain::assess::assess;
    use audit_domain::entity::academic_record::{AcademicRecord, SharedCourse};
    use audit_domain::entity::course::{Course, CourseInput};
    use audit_domain::entity::student_profile::StudentProfile;
    use audit_domain::ruleset::default;
    use audit_domain::value::{CourseId, Credit, Grade, SubjectCategory};
    use std::sync::Arc;

    fn tiny_record() -> AcademicRecord {
        let course: SharedCourse = Arc::new(
            Course::of(CourseInput {
                id: CourseId::of("c1").unwrap(),
                name: "大学基礎論".to_owned(),
                credit: Credit::new(2),
                grade: Grade::Yu,
                category: SubjectCategory::CommonPrimary,
                raw_category_label: String::new(),
                year: Some(2022),
                teacher: None,
                score: None,
            })
            .unwrap(),
        );
        AcademicRecord::new(
            StudentProfile::new("人文社会科学部", "人文科学コース", 2022).unwrap(),
            vec![course],
        )
    }

    fn header() -> ReportHeader {
        ReportHeader {
            faculty: "人文社会科学部".to_owned(),
            course: "人文科学コース".to_owned(),
            matriculation_year: 2022,
        }
    }

    #[test]
    fn renders_header_and_status() {
        let record = tiny_record();
        let assessment = assess(&record, &default::rule_set());
        let text = format_assessment(&assessment, &header(), false, &Palette::plain());
        assert!(text.contains("人文社会科学部 人文科学コース（2022年度入学）"));
        assert!(text.contains("■ 卒業要件"));
        assert!(text.contains("✘")); // under-satisfied with a single course
        assert!(text.contains("卒業論文履修資格"));
    }

    #[test]
    fn plain_palette_emits_no_ansi() {
        let record = tiny_record();
        let assessment = assess(&record, &default::rule_set());
        let text = format_assessment(&assessment, &header(), true, &Palette::plain());
        assert!(!text.contains('\u{1b}'));
    }

    #[test]
    fn fancy_palette_colourises_and_draws_a_panel() {
        let record = tiny_record();
        let assessment = assess(&record, &default::rule_set());
        let text = format_assessment(&assessment, &header(), false, &Palette::colored());
        assert!(text.contains('\u{1b}')); // coloured
        assert!(text.contains('╭')); // summary panel
        assert!(text.contains('█') || text.contains('░')); // progress bar
    }
}
