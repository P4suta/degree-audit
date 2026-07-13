#![no_main]

use libfuzzer_sys::fuzz_target;

// Contract: extract() must never panic on arbitrary bytes — it returns Err on
// anything it can't decode. This guards the PDF content-stream / CMap decoder,
// which runs on untrusted transcript bytes at the wasm boundary.
fuzz_target!(|data: &[u8]| {
    let _ = pdf_glyphs::extract(data);
});
