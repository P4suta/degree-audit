//! Gated end-to-end oracle against the real 高知大学 個別成績表 PDF.
//!
//! The source PDF contains PII and is never committed. The test reads it from an
//! absolute path (overridable via `TRANSCRIPT_ORACLE`, falling back to the
//! `PDF_GLYPHS_ORACLE` path used by the sibling crate) and is a no-op when the
//! file is absent, so CI without the file still passes.
//!
//! The strongest assertion runs the full import + assessment pipeline and checks
//! that the sum of passing credits equals 138 (the 修得 grand total printed in the
//! transcript's own summary table) and that the student is tentatively
//! graduatable once the in-progress 卒業論文 passes.

use std::path::PathBuf;

use audit_app::import_transcript;
use audit_domain::assess::assess;
use audit_domain::entity::student_profile::StudentProfile;
use audit_domain::ruleset::default;
use audit_domain::value::SubjectKind;

use transcript_parse::{PdfTranscript, parse_header, parse_pdf};

const DEFAULT_ORACLE: &str = r"C:\Users\livec\Downloads\個別成績表（最新） (1).pdf";

/// The 修得単位 grand total printed in the transcript summary table.
const EXPECTED_PASSING_CREDITS: u32 = 138;

fn oracle_path() -> PathBuf {
    std::env::var_os("TRANSCRIPT_ORACLE")
        .or_else(|| std::env::var_os("PDF_GLYPHS_ORACLE"))
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(DEFAULT_ORACLE))
}

fn read_oracle() -> Option<Vec<u8>> {
    let path = oracle_path();
    if !path.exists() {
        eprintln!("oracle PDF not found at {}; skipping", path.display());
        return None;
    }
    Some(std::fs::read(&path).expect("read oracle PDF"))
}

#[test]
fn header_reports_faculty_course_and_matriculation() {
    let Some(bytes) = read_oracle() else {
        return;
    };
    let header = parse_header(&bytes).expect("parse header");
    assert_eq!(header.faculty, "人文社会科学部");
    assert_eq!(header.course, "人文科学コース");
    assert_eq!(header.matriculation_year, 2022);
}

#[test]
fn parses_a_sane_number_of_courses() {
    let Some(bytes) = read_oracle() else {
        return;
    };
    let courses = parse_pdf(&bytes).expect("parse pdf");
    // Ground-truth hand count is 75 rows (74 passing + the in-progress thesis).
    assert!(
        courses.len() >= 70,
        "expected >= 70 course rows, got {}",
        courses.len()
    );
}

#[test]
fn passing_credits_total_138_and_tentatively_graduatable() {
    let Some(bytes) = read_oracle() else {
        return;
    };

    let profile = StudentProfile::new("人文社会科学部", "人文科学コース", 2022).unwrap();
    let rule_set = default::rule_set();
    let outcome =
        import_transcript(&bytes, &PdfTranscript, &rule_set, profile).expect("import transcript");

    // Debug aid when an assertion below fails.
    if !outcome.skipped.is_empty() {
        eprintln!("--- skipped rows ({}) ---", outcome.skipped.len());
        for failure in &outcome.skipped {
            eprintln!("  {:?}: {}", failure.raw.name, failure.error.message);
        }
    }
    if outcome.unknown_category_count > 0 {
        eprintln!(
            "--- unknown-category courses ({}) ---",
            outcome.unknown_category_count
        );
        for c in outcome.record.courses.iter() {
            if c.kind() == SubjectKind::Unknown {
                eprintln!("  {:?}  label={:?}", c.name, c.raw_category_label);
            }
        }
    }

    let total = outcome.record.total_credits().get();
    eprintln!(
        "parsed {} courses, {} passing credits, {} unknown",
        outcome.record.courses.len(),
        total,
        outcome.unknown_category_count
    );

    assert_eq!(
        outcome.unknown_category_count, 0,
        "every course must classify to a known category"
    );
    assert_eq!(
        total, EXPECTED_PASSING_CREDITS,
        "sum of passing credits must equal the transcript's 修得 grand total"
    );

    let assessment = assess(&outcome.record, &rule_set);
    for step in &assessment.steps {
        eprintln!(
            "step {:<14} satisfied={} {}/{}",
            step.label, step.result.satisfied, step.result.actual, step.result.required
        );
    }
    let tentative = assessment
        .tentative
        .expect("in-progress 卒業論文 should yield a tentative projection");
    assert!(
        tentative.graduatable,
        "once the in-progress 卒業論文 passes, the student should be graduatable"
    );
}
