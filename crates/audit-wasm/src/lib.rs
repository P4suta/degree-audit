//! audit-wasm — the browser driving adapter over the shared Rust core.
//!
//! The boundary hands back structured `JsValue`s produced by
//! [`serde_wasm_bindgen`], not JSON strings — the JS side receives ready objects
//! with no `JSON.parse` round-trip. Because the domain's `Assessment`,
//! `SpecResult`, and `Course` all derive `Serialize`, the wire shape is produced
//! by the domain types directly (the case-for-a-declarative-AST payoff); the
//! SvelteKit front-end consumes the very same shape the CLI's `--json` emits.

#![forbid(unsafe_code)]

use audit_app::import_transcript;
use audit_domain::assess::{Assessment, assess};
use audit_domain::entity::academic_record::SharedCourse;
use audit_domain::entity::student_profile::StudentProfile;
use audit_domain::ruleset::Registry;
use serde::Serialize;
use transcript_parse::{PdfTranscript, parse_header};
use wasm_bindgen::prelude::*;

/// Serialize any domain value straight into a `JsValue` (camelCase preserved by
/// the types' own `#[serde(rename_all)]`). Uses the JSON-compatible serializer so
/// maps become plain objects (not JS `Map`s) — the wire shape stays byte-for-byte
/// what `JSON.parse` used to yield, so the front-end's normalizers are unchanged.
/// Fails only if serialization fails.
fn to_js<T: Serialize + ?Sized>(value: &T) -> Result<JsValue, JsError> {
    value
        .serialize(&serde_wasm_bindgen::Serializer::json_compatible())
        .map_err(|e| JsError::new(&e.to_string()))
}

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

/// One rule set's public metadata, as the front-end's rule-set picker needs it.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RuleSetMeta {
    id: &'static str,
    display_name: &'static str,
    specificity: u32,
}

/// Build the rule-set metadata list. Pure and native-testable (the wasm-bound
/// [`rule_sets`] wrapper only adds `JsValue` serialization on top).
fn rule_set_metas() -> Vec<RuleSetMeta> {
    Registry::standard()
        .rule_sets
        .iter()
        .map(|rs| RuleSetMeta {
            id: rs.metadata.id,
            display_name: rs.metadata.display_name,
            specificity: rs.metadata.specificity,
        })
        .collect()
}

/// Import an official PDF transcript and assess it in one call, returning a
/// structured object (`{ assessment, courses, profile, skipped,
/// unknownCategoryCount }`) that the SvelteKit front-end feeds straight into its
/// existing stores.
///
/// # Errors
/// Fails if the PDF header is unreadable, no rule set applies, the transcript
/// cannot be imported, or the result cannot be serialized to a JS value.
#[wasm_bindgen(js_name = importPdf)]
pub fn import_pdf(bytes: &[u8]) -> Result<JsValue, JsError> {
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
    to_js(&bundle)
}

/// Assess graduation directly from the bytes of an official PDF transcript.
/// The profile (faculty/course/matriculation year) is read from the PDF header.
/// Returns the `Assessment` as a JS value.
///
/// # Errors
/// Same failure modes as [`import_pdf`].
#[wasm_bindgen(js_name = assessFromPdf)]
pub fn assess_from_pdf(bytes: &[u8]) -> Result<JsValue, JsError> {
    let header = parse_header(bytes).map_err(js_error)?;
    let profile = StudentProfile::new(&header.faculty, &header.course, header.matriculation_year)
        .map_err(js_error)?;
    let registry = Registry::standard();
    let rule_set = registry.resolve(&profile).map_err(js_error)?;
    let outcome = import_transcript(bytes, &PdfTranscript, rule_set, profile).map_err(js_error)?;
    let assessment = assess(&outcome.record, rule_set);
    to_js(&assessment)
}

/// List the available rule sets as an array of `{ id, displayName, specificity }`.
///
/// # Errors
/// Fails only if the metadata cannot be serialized to a JS value.
#[wasm_bindgen(js_name = ruleSets)]
pub fn rule_sets() -> Result<JsValue, JsError> {
    to_js(&rule_set_metas())
}

/// Route Rust panics to `console.error` for legible stack traces in the browser.
#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}

fn js_error(e: impl std::fmt::Display) -> JsError {
    JsError::new(&e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rule_set_metas_lists_both() {
        let ids: Vec<&str> = rule_set_metas().iter().map(|m| m.id).collect();
        assert!(ids.contains(&"humanities/2020-2023"));
        assert!(ids.contains(&"humanities/2024-"));
    }
}
