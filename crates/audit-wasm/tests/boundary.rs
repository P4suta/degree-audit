#![cfg(target_arch = "wasm32")]
//! Boundary tests for the `#[wasm_bindgen]` surface, run under node via
//! `wasm-pack test --node`. They pin the `JsValue` *shape* the front-end depends
//! on — camelCase keys, no snake_case leakage — plus error propagation, without
//! needing a PDF fixture (the happy-path serialization is covered by `ruleSets`).

use audit_wasm::{import_pdf, rule_sets};
use wasm_bindgen::JsValue;
use wasm_bindgen_test::wasm_bindgen_test;

fn stringify(v: &JsValue) -> String {
    js_sys::JSON::stringify(v)
        .expect("JSON.stringify")
        .as_string()
        .expect("string")
}

#[wasm_bindgen_test]
fn rule_sets_serializes_with_camel_case_keys() {
    let json = stringify(&rule_sets().expect("rule_sets serializes"));
    // The front-end reads `displayName`; a snake_case leak would silently break it.
    assert!(json.contains("\"displayName\""), "camelCase key: {json}");
    assert!(!json.contains("display_name"), "no snake_case leak: {json}");
    // Both standard rule sets are listed.
    assert!(json.contains("humanities/2020-2023"), "rule sets: {json}");
    assert!(json.contains("humanities/2024-"), "rule sets: {json}");
}

#[wasm_bindgen_test]
fn import_pdf_rejects_non_pdf_bytes() {
    // A non-PDF blob must surface an Err — not panic, not a bogus object.
    assert!(import_pdf(b"this is definitely not a pdf").is_err());
}
