#![no_main]

use libfuzzer_sys::fuzz_target;

// Contract: the full parse pipeline (glyph extraction → geometric column
// reconstruction → header + course rows) must never panic on arbitrary bytes.
fuzz_target!(|data: &[u8]| {
    let _ = transcript_parse::parse_pdf_contents(data);
});
