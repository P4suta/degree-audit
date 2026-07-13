//! audit-wasm — the browser driving adapter over the shared Rust core.
//!
//! The boundary is JSON in, JSON out. Because the domain's `Assessment`,
//! `SpecResult`, and `Course` all derive `Serialize`, the wire shape is produced
//! by the domain types directly — there is no hand-written mapping layer. A
//! future SvelteKit front-end consumes the very same shape the CLI's `--json`
//! emits (the case-for-a-declarative-AST payoff).

use audit_app::import_transcript;
use audit_domain::assess::{Assessment, assess};
use audit_domain::entity::academic_record::SharedCourse;
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
    fn rule_sets_json_lists_both() {
        let json = rule_sets_json();
        assert!(json.contains("humanities/2020-2023"));
        assert!(json.contains("humanities/2024-"));
    }
}
