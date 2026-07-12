//! audit-wasm — the browser driving adapter over the shared Rust core.
//!
//! The boundary is JSON in, JSON out. Because the domain's `Assessment`,
//! `SpecResult`, and `Course` all derive `Serialize`, the wire shape is produced
//! by the domain types directly — there is no hand-written mapping layer. A
//! future SvelteKit front-end consumes the very same shape the CLI's `--json`
//! emits (the case-for-a-declarative-AST payoff).

use std::sync::Arc;

use audit_app::{RawCourse, import_transcript, map_raw_courses};
use audit_domain::assess::{Assessment, assess};
use audit_domain::entity::academic_record::{AcademicRecord, SharedCourse};
use audit_domain::entity::student_profile::StudentProfile;
use audit_domain::ruleset::Registry;
use serde::Serialize;
use transcript_parse::{PdfTranscript, parse_header};
use wasm_bindgen::prelude::*;

/// Everything the web front-end needs from one PDF import: the assessment, the
/// full course list (for the allocation view), the profile read from the header,
/// and import health counts. Field names match the TypeScript app's types.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WebImport {
    assessment: Assessment,
    courses: Vec<SharedCourse>,
    profile: StudentProfile,
    skipped: usize,
    unknown_category_count: usize,
}

/// Import an official PDF transcript and assess it in one call, returning a JSON
/// bundle (`{ assessment, courses, profile, skipped, unknownCategoryCount }`) that
/// the SvelteKit front-end feeds straight into its existing stores.
#[wasm_bindgen]
pub fn import_pdf_json(bytes: &[u8]) -> Result<String, JsError> {
    let header = parse_header(bytes).map_err(js_error)?;
    let profile = StudentProfile::new(&header.faculty, &header.course, header.matriculation_year)
        .map_err(js_error)?;
    let registry = Registry::standard();
    let rule_set = registry.resolve(&profile).map_err(js_error)?;
    let outcome =
        import_transcript(bytes, &PdfTranscript, rule_set, profile.clone()).map_err(js_error)?;
    let assessment = assess(&outcome.record, rule_set);

    let bundle = WebImport {
        assessment,
        courses: outcome.record.courses.clone(),
        profile,
        skipped: outcome.skipped.len(),
        unknown_category_count: outcome.unknown_category_count,
    };
    serde_json::to_string(&bundle).map_err(js_error)
}

/// Assess graduation directly from the bytes of an official PDF transcript.
/// The profile (faculty/course/matriculation year) is read from the PDF header.
/// Returns the `Assessment` as a JSON string.
#[wasm_bindgen]
pub fn assess_from_pdf(bytes: &[u8]) -> Result<String, JsError> {
    let header = parse_header(bytes).map_err(js_error)?;
    let profile = StudentProfile::new(&header.faculty, &header.course, header.matriculation_year)
        .map_err(js_error)?;
    let registry = Registry::standard();
    let rule_set = registry.resolve(&profile).map_err(js_error)?;
    let outcome = import_transcript(bytes, &PdfTranscript, rule_set, profile).map_err(js_error)?;
    let assessment = assess(&outcome.record, rule_set);
    serde_json::to_string(&assessment).map_err(js_error)
}

/// Assess graduation from a JSON array of `RawCourse` rows plus a profile.
/// Returns the `Assessment` as a JSON string (the same shape as the CLI `--json`).
#[wasm_bindgen]
pub fn assess_from_raw_json(
    raws_json: &str,
    faculty: &str,
    course: &str,
    matriculation_year: u16,
) -> Result<String, JsError> {
    let raws: Vec<RawCourse> = serde_json::from_str(raws_json).map_err(js_error)?;
    let profile = StudentProfile::new(faculty, course, matriculation_year).map_err(js_error)?;

    let registry = Registry::standard();
    let rule_set = registry.resolve(&profile).map_err(js_error)?;

    let mapping = map_raw_courses(&raws, rule_set.category_map);
    let courses = mapping.courses.into_iter().map(Arc::new).collect();
    let record = AcademicRecord::new(profile, courses);
    let assessment = assess(&record, rule_set);

    serde_json::to_string(&assessment).map_err(js_error)
}

/// List the available rule sets as a JSON array of `{ id, displayName, specificity }`.
#[wasm_bindgen]
pub fn rule_sets_json() -> String {
    let registry = Registry::standard();
    let entries: Vec<_> = registry
        .rule_sets
        .iter()
        .map(|rs| {
            serde_json::json!({
                "id": rs.metadata.id,
                "displayName": rs.metadata.display_name,
                "specificity": rs.metadata.specificity,
            })
        })
        .collect();
    serde_json::Value::Array(entries).to_string()
}

fn js_error(e: impl std::fmt::Display) -> JsError {
    JsError::new(&e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn assess_from_raw_json_returns_assessment_shape() {
        let raws = r#"[
            {"rawCategoryLabel":"共通教育 / 初年次科目","name":"大学基礎論","creditText":"2","gradeText":"優","yearText":"2022"}
        ]"#;
        let json = assess_from_raw_json(raws, "人文社会科学部", "人文科学コース", 2022).unwrap();
        assert!(json.contains("\"graduatable\":false"));
        assert!(json.contains("\"totalCreditsRequired\":124"));
        assert!(json.contains("\"steps\""));
    }

    #[test]
    fn rule_sets_json_lists_both() {
        let json = rule_sets_json();
        assert!(json.contains("humanities/2020-2023"));
        assert!(json.contains("humanities/2024-"));
    }
}
