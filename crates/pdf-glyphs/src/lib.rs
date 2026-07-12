//! Positioned text-fragment extraction from "Microsoft Print To PDF" documents.
//!
//! [`extract`] parses PDF bytes, decodes each page's content stream(s), replays
//! the text-showing operators, and returns one [`Fragment`] per shown text run
//! (`Tj` / `TJ`). Each fragment carries its baseline origin in PDF user space
//! (the translation of `text matrix · CTM`) and the current font size. CID codes
//! are mapped to Unicode through the font's `/ToUnicode` CMap.
//!
//! The crate is pure Rust and builds for `wasm32-unknown-unknown`. It provides
//! only accurate positioned fragments; column-splitting and row-clustering are
//! the concern of a later crate.

mod cmap;
mod content;

use std::collections::BTreeMap;
use std::error::Error;
use std::fmt;

use lopdf::content::Content;
use lopdf::{Dictionary, Document, Object};

use cmap::ToUnicode;

/// A single positioned text run extracted from a page.
#[derive(Debug, Clone, PartialEq)]
pub struct Fragment {
    /// 1-based page number the fragment was found on.
    pub page: u16,
    /// Baseline origin x in PDF user space (points).
    pub x: f32,
    /// Baseline origin y in PDF user space (points).
    pub y: f32,
    /// Font size in effect for the run (the `Tf` operand).
    pub font_size: f32,
    /// Decoded Unicode text of the run.
    pub text: String,
}

/// Error returned by [`extract`].
#[derive(Debug)]
pub enum ExtractError {
    /// The PDF container could not be parsed.
    Parse(lopdf::Error),
}

impl fmt::Display for ExtractError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ExtractError::Parse(e) => write!(f, "failed to parse PDF: {e}"),
        }
    }
}

impl Error for ExtractError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            ExtractError::Parse(e) => Some(e),
        }
    }
}

impl From<lopdf::Error> for ExtractError {
    fn from(e: lopdf::Error) -> Self {
        ExtractError::Parse(e)
    }
}

/// Extract positioned text fragments from PDF `bytes`.
///
/// Returns fragments in content-stream order, grouped by ascending page number.
/// A page whose content or fonts cannot be decoded is skipped rather than
/// failing the whole document; only a failure to parse the container itself is
/// reported as an error.
pub fn extract(bytes: &[u8]) -> Result<Vec<Fragment>, ExtractError> {
    let doc = Document::load_mem(bytes)?;
    let mut fragments = Vec::new();

    for (page_number, page_id) in doc.get_pages() {
        let page = page_number.min(u16::MAX as u32) as u16;
        let fonts = load_page_fonts(&doc, page_id);

        let Ok(content_bytes) = doc.get_page_content(page_id) else {
            continue;
        };
        let Ok(content) = Content::decode(&content_bytes) else {
            continue;
        };
        content::interpret(page, &content.operations, &fonts, &mut fragments);
    }

    Ok(fragments)
}

/// Build the `font resource name -> ToUnicode` map for a page. Fonts without a
/// usable `/ToUnicode` stream are omitted.
fn load_page_fonts(doc: &Document, page_id: (u32, u16)) -> BTreeMap<Vec<u8>, ToUnicode> {
    let mut fonts = BTreeMap::new();
    let Ok(font_dicts) = doc.get_page_fonts(page_id) else {
        return fonts;
    };
    for (name, dict) in font_dicts {
        if let Some(to_unicode) = load_to_unicode(doc, dict) {
            fonts.insert(name, to_unicode);
        }
    }
    fonts
}

/// Resolve and parse a font dictionary's `/ToUnicode` CMap stream.
fn load_to_unicode(doc: &Document, font: &Dictionary) -> Option<ToUnicode> {
    let object = font.get(b"ToUnicode").ok()?;
    let stream = match object {
        Object::Reference(id) => doc.get_object(*id).ok()?.as_stream().ok()?,
        Object::Stream(stream) => stream,
        _ => return None,
    };
    // `lopdf` decompresses regular streams during `load_mem`, dropping the
    // `/Filter` entry; in that case `decompressed_content` errors and the raw
    // `content` already holds the decoded CMap. Fall back accordingly.
    let bytes = stream
        .decompressed_content()
        .unwrap_or_else(|_| stream.content.clone());
    Some(ToUnicode::parse(&bytes))
}
