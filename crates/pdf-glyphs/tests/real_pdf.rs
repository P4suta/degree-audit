//! Integration test against a real "Microsoft Print To PDF" transcript.
//!
//! The source PDF contains PII and is never committed. The test reads it from an
//! absolute path (overridable via the `PDF_GLYPHS_ORACLE` environment variable)
//! and is a no-op when the file is absent, so CI without the file still passes.

use std::path::PathBuf;

use pdf_glyphs::{Fragment, extract};

/// Default local location of the oracle PDF (full-width parens and a space).
const DEFAULT_ORACLE: &str = r"C:\Users\livec\Downloads\個別成績表（最新） (1).pdf";

fn oracle_path() -> PathBuf {
    std::env::var_os("PDF_GLYPHS_ORACLE")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(DEFAULT_ORACLE))
}

/// Concatenate fragment text in approximate reading order: top-to-bottom
/// (PDF y descends down the page), then left-to-right within a row band.
fn reading_order_text(fragments: &[Fragment], page: u16) -> String {
    let mut rows: Vec<&Fragment> = fragments.iter().filter(|f| f.page == page).collect();
    rows.sort_by(|a, b| {
        let ay = a.y.round() as i32;
        let by = b.y.round() as i32;
        by.cmp(&ay)
            .then(a.x.partial_cmp(&b.x).unwrap_or(std::cmp::Ordering::Equal))
    });
    rows.into_iter().map(|f| f.text.as_str()).collect()
}

#[test]
fn extracts_positioned_fragments_from_real_transcript() {
    let path = oracle_path();
    if !path.exists() {
        eprintln!("oracle PDF not found at {}; skipping", path.display());
        return;
    }

    let bytes = std::fs::read(&path).expect("read oracle PDF");
    let fragments = extract(&bytes).expect("extract fragments");
    assert!(!fragments.is_empty(), "expected some fragments");

    // (a) Exactly two pages' worth of fragments.
    let mut pages: Vec<u16> = fragments.iter().map(|f| f.page).collect();
    pages.sort_unstable();
    pages.dedup();
    assert_eq!(
        pages,
        vec![1, 2],
        "expected fragments on exactly pages 1 and 2"
    );

    // (b) Concatenated (reading-order) text contains the known key strings.
    // Whitespace is normalised away because the page title is letter-spaced
    // (real space glyphs between each kanji); none of the needles contain
    // whitespace, so this only removes incidental spacing.
    let all_text: String = (1..=2)
        .map(|p| reading_order_text(&fragments, p))
        .collect::<String>();
    let compact: String = all_text.chars().filter(|c| !c.is_whitespace()).collect();
    for needle in [
        "個別成績表",
        "人文社会科学部",
        "人文科学コース",
        "共通教育",
        "国際社会研究入門",
        "卒業論文",
        "秀:100",
        "高知大学",
    ] {
        assert!(compact.contains(needle), "missing key string: {needle}");
    }

    // (c) A left/right column split is visible on page 1: two fragments that
    // share a y-band but sit far apart horizontally.
    let page1: Vec<&Fragment> = fragments.iter().filter(|f| f.page == 1).collect();
    let split = page1.iter().any(|left| {
        page1
            .iter()
            .any(|right| (left.y - right.y).abs() < 3.0 && right.x - left.x > 150.0)
    });
    assert!(
        split,
        "expected a visible left/right column split on page 1"
    );
}
