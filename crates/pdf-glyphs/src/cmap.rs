//! Minimal parser for a font's `/ToUnicode` CMap.
//!
//! A ToUnicode CMap is a small PostScript-flavoured program that maps character
//! codes (for Identity-H Type0 fonts, the 2-byte CID) to Unicode scalar values.
//! Only the pieces relevant to text extraction are interpreted:
//!
//! - `begincodespacerange` / `endcodespacerange` — used solely to learn the
//!   code width in bytes (e.g. `<0000> <FFFF>` implies 2-byte codes).
//! - `beginbfchar` / `endbfchar` — individual `src -> dst` mappings.
//! - `beginbfrange` / `endbfrange` — contiguous `lo hi dst` ranges, or the
//!   array form `lo hi [dst0 dst1 ...]`.
//!
//! Destinations are UTF-16BE byte strings, so a single code may expand to more
//! than one Unicode scalar (ligatures, surrogate pairs).

use std::collections::HashMap;

/// A parsed `/ToUnicode` CMap: a lookup from character code to Unicode text.
#[derive(Debug, Clone)]
pub(crate) struct ToUnicode {
    /// Direct `code -> text` mappings (from `bfchar` and array-form `bfrange`).
    singles: HashMap<u32, String>,
    /// Contiguous ranges `[lo, hi]` whose destination increments with the code.
    ranges: Vec<Range>,
    /// Width of a character code in bytes, taken from the codespace range.
    code_bytes: usize,
}

#[derive(Debug, Clone)]
struct Range {
    lo: u32,
    hi: u32,
    /// UTF-16 code units of the destination for `lo`; the last unit is offset
    /// by `code - lo` for the rest of the range.
    dst: Vec<u16>,
}

impl ToUnicode {
    /// Number of bytes that make up one character code (defaults to 2).
    pub(crate) fn code_bytes(&self) -> usize {
        self.code_bytes
    }

    /// Map a single character code to its Unicode text, if known.
    pub(crate) fn lookup(&self, code: u32) -> Option<String> {
        if let Some(text) = self.singles.get(&code) {
            return Some(text.clone());
        }
        for range in &self.ranges {
            if code >= range.lo && code <= range.hi {
                let mut units = range.dst.clone();
                if let Some(last) = units.last_mut() {
                    *last = last.wrapping_add((code - range.lo) as u16);
                }
                return Some(String::from_utf16_lossy(&units));
            }
        }
        None
    }

    /// Parse a decompressed ToUnicode CMap. Malformed fragments are skipped
    /// rather than aborting, so a partially valid CMap still yields mappings.
    pub(crate) fn parse(bytes: &[u8]) -> ToUnicode {
        let tokens = tokenize(bytes);
        let mut singles = HashMap::new();
        let mut ranges = Vec::new();
        let mut code_bytes = 2usize;

        let mut i = 0;
        while i < tokens.len() {
            match &tokens[i] {
                Token::Keyword(kw) if kw == "begincodespacerange" => {
                    i += 1;
                    while i < tokens.len() && !tokens[i].is_keyword("endcodespacerange") {
                        if let (Token::Hex(lo), Some(Token::Hex(_))) =
                            (&tokens[i], tokens.get(i + 1))
                        {
                            code_bytes = lo.len().max(1);
                            i += 2;
                        } else {
                            i += 1;
                        }
                    }
                }
                Token::Keyword(kw) if kw == "beginbfchar" => {
                    i += 1;
                    while i < tokens.len() && !tokens[i].is_keyword("endbfchar") {
                        if let (Token::Hex(src), Some(Token::Hex(dst))) =
                            (&tokens[i], tokens.get(i + 1))
                        {
                            singles.insert(be_to_u32(src), utf16be_to_string(dst));
                            i += 2;
                        } else {
                            i += 1;
                        }
                    }
                }
                Token::Keyword(kw) if kw == "beginbfrange" => {
                    i += 1;
                    while i < tokens.len() && !tokens[i].is_keyword("endbfrange") {
                        i = parse_bfrange_entry(&tokens, i, &mut singles, &mut ranges);
                    }
                }
                _ => i += 1,
            }
        }

        ToUnicode {
            singles,
            ranges,
            code_bytes,
        }
    }
}

/// Parse a single `bfrange` entry starting at `i`, returning the next index.
fn parse_bfrange_entry(
    tokens: &[Token],
    i: usize,
    singles: &mut HashMap<u32, String>,
    ranges: &mut Vec<Range>,
) -> usize {
    let (Some(Token::Hex(lo)), Some(Token::Hex(hi))) = (tokens.get(i), tokens.get(i + 1)) else {
        return i + 1;
    };
    let lo_code = be_to_u32(lo);
    let hi_code = be_to_u32(hi);
    match tokens.get(i + 2) {
        // Contiguous form: lo hi <dst>
        Some(Token::Hex(dst)) => {
            ranges.push(Range {
                lo: lo_code,
                hi: hi_code,
                dst: utf16be_units(dst),
            });
            i + 3
        }
        // Array form: lo hi [<dst0> <dst1> ...]
        Some(Token::ArrayStart) => {
            let mut j = i + 3;
            let mut code = lo_code;
            while j < tokens.len() && !matches!(tokens[j], Token::ArrayEnd) {
                if let Token::Hex(dst) = &tokens[j] {
                    if code <= hi_code {
                        singles.insert(code, utf16be_to_string(dst));
                    }
                    code += 1;
                }
                j += 1;
            }
            j + 1
        }
        _ => i + 2,
    }
}

/// A token from the CMap program stream.
#[derive(Debug, Clone, PartialEq)]
enum Token {
    /// A `<...>` hex string, decoded to raw bytes.
    Hex(Vec<u8>),
    ArrayStart,
    ArrayEnd,
    Keyword(String),
}

impl Token {
    fn is_keyword(&self, name: &str) -> bool {
        matches!(self, Token::Keyword(k) if k == name)
    }
}

/// Split a CMap program into the small token set the parser understands.
/// Names, numbers, dict markers and literal strings are collapsed to keywords
/// or skipped — only hex strings and array delimiters carry data we use.
fn tokenize(bytes: &[u8]) -> Vec<Token> {
    let mut tokens = Vec::new();
    let mut i = 0;
    while i < bytes.len() {
        let b = bytes[i];
        match b {
            // Whitespace.
            b if b.is_ascii_whitespace() || b == 0 => i += 1,
            // Comment to end of line.
            b'%' => {
                while i < bytes.len() && bytes[i] != b'\n' && bytes[i] != b'\r' {
                    i += 1;
                }
            }
            // Dict markers `<<` / `>>`, or a `<...>` hex string.
            b'<' => {
                if bytes.get(i + 1) == Some(&b'<') {
                    i += 2;
                    continue;
                }
                let mut hex = Vec::new();
                i += 1;
                while i < bytes.len() && bytes[i] != b'>' {
                    if let Some(v) = (bytes[i] as char).to_digit(16) {
                        hex.push(v as u8);
                    }
                    i += 1;
                }
                i += 1; // consume '>'
                tokens.push(Token::Hex(pack_nibbles(&hex)));
            }
            b'>' => i += 1,
            b'[' => {
                tokens.push(Token::ArrayStart);
                i += 1;
            }
            b']' => {
                tokens.push(Token::ArrayEnd);
                i += 1;
            }
            // Literal `(...)` string — skipped (never a destination in practice).
            b'(' => {
                let mut depth = 1;
                i += 1;
                while i < bytes.len() && depth > 0 {
                    match bytes[i] {
                        b'\\' => i += 1,
                        b'(' => depth += 1,
                        b')' => depth -= 1,
                        _ => {}
                    }
                    i += 1;
                }
            }
            // A name `/Foo` — treated as an opaque keyword.
            b'/' => {
                let start = i;
                i += 1;
                while i < bytes.len() && !is_delimiter(bytes[i]) {
                    i += 1;
                }
                tokens.push(Token::Keyword(
                    String::from_utf8_lossy(&bytes[start..i]).into_owned(),
                ));
            }
            // A bare word (keyword or number).
            _ => {
                let start = i;
                while i < bytes.len() && !is_delimiter(bytes[i]) {
                    i += 1;
                }
                tokens.push(Token::Keyword(
                    String::from_utf8_lossy(&bytes[start..i]).into_owned(),
                ));
            }
        }
    }
    tokens
}

/// Whether `b` ends a bare word: whitespace or a PDF delimiter character.
fn is_delimiter(b: u8) -> bool {
    b.is_ascii_whitespace()
        || b == 0
        || matches!(
            b,
            b'<' | b'>' | b'[' | b']' | b'(' | b')' | b'{' | b'}' | b'/' | b'%'
        )
}

/// Pack a sequence of 4-bit nibbles into bytes (odd counts are right-padded).
fn pack_nibbles(nibbles: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(nibbles.len().div_ceil(2));
    let mut iter = nibbles.chunks(2);
    for pair in &mut iter {
        let hi = pair[0];
        let lo = pair.get(1).copied().unwrap_or(0);
        out.push((hi << 4) | lo);
    }
    out
}

/// Interpret big-endian bytes as an unsigned integer (character code).
fn be_to_u32(bytes: &[u8]) -> u32 {
    bytes.iter().fold(0u32, |acc, &b| (acc << 8) | b as u32)
}

/// Interpret UTF-16BE bytes as a sequence of code units.
fn utf16be_units(bytes: &[u8]) -> Vec<u16> {
    bytes
        .chunks(2)
        .map(|c| ((c[0] as u16) << 8) | *c.get(1).unwrap_or(&0) as u16)
        .collect()
}

/// Decode UTF-16BE bytes to a `String` (lossy on unpaired surrogates).
fn utf16be_to_string(bytes: &[u8]) -> String {
    String::from_utf16_lossy(&utf16be_units(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_bfchar_pairs() {
        let cmap = b"1 begincodespacerange <0000> <FFFF> endcodespacerange\n\
                     2 beginbfchar\n<0003> <0020>\n<0041> <3042>\nendbfchar";
        let tu = ToUnicode::parse(cmap);
        assert_eq!(tu.code_bytes(), 2);
        assert_eq!(tu.lookup(0x0003).as_deref(), Some(" "));
        assert_eq!(tu.lookup(0x0041).as_deref(), Some("\u{3042}")); // あ
        assert_eq!(tu.lookup(0x9999), None);
    }

    #[test]
    fn parses_contiguous_bfrange() {
        let cmap = b"1 beginbfrange\n<0000> <0002> <0041>\nendbfrange";
        let tu = ToUnicode::parse(cmap);
        assert_eq!(tu.lookup(0x0000).as_deref(), Some("A"));
        assert_eq!(tu.lookup(0x0001).as_deref(), Some("B"));
        assert_eq!(tu.lookup(0x0002).as_deref(), Some("C"));
        assert_eq!(tu.lookup(0x0003), None);
    }

    #[test]
    fn parses_array_bfrange() {
        let cmap = b"1 beginbfrange\n<0005> <0007> [<0058> <0059> <005A>]\nendbfrange";
        let tu = ToUnicode::parse(cmap);
        assert_eq!(tu.lookup(0x0005).as_deref(), Some("X"));
        assert_eq!(tu.lookup(0x0006).as_deref(), Some("Y"));
        assert_eq!(tu.lookup(0x0007).as_deref(), Some("Z"));
    }

    #[test]
    fn destination_can_be_multiple_scalars() {
        // A ligature code mapping to "ff".
        let cmap = b"1 beginbfchar\n<0001> <00660066>\nendbfchar";
        let tu = ToUnicode::parse(cmap);
        assert_eq!(tu.lookup(0x0001).as_deref(), Some("ff"));
    }

    #[test]
    fn one_byte_codespace_is_detected() {
        let cmap = b"1 begincodespacerange <00> <FF> endcodespacerange\n\
                     1 beginbfchar <41> <0041> endbfchar";
        let tu = ToUnicode::parse(cmap);
        assert_eq!(tu.code_bytes(), 1);
        assert_eq!(tu.lookup(0x41).as_deref(), Some("A"));
    }

    #[test]
    fn comments_and_names_are_skipped() {
        let cmap = b"%!PS-Adobe\n/CIDInit /ProcSet findresource begin\n\
                     1 beginbfchar\n<0003> <0020> %% space\nendbfchar\nend";
        let tu = ToUnicode::parse(cmap);
        assert_eq!(tu.lookup(0x0003).as_deref(), Some(" "));
    }

    #[test]
    fn empty_input_yields_no_mappings() {
        let tu = ToUnicode::parse(b"");
        assert_eq!(tu.lookup(0x0003), None);
        assert_eq!(tu.code_bytes(), 2);
    }
}
