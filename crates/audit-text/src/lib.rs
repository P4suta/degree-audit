//! Text preprocessing layer. Uniformly closes off notational variance and attack
//! surface caused by full-/half-width forms, Roman numerals, decorative markers,
//! invisible characters, and control characters — all at the boundary.
//!
//! - [`canonicalize`]  For storage/display. NFKC + strip invisible + strip control chars.
//! - [`sanitize_line`] For a single line of user input. canonicalize + fold line breaks + length cap.
//! - [`match_key`]     For string matching. canonicalize + strip decorative markers + strip whitespace + lowercase.

use unicode_normalization::UnicodeNormalization;

/// Default maximum character count for [`sanitize_line`].
pub const DEFAULT_MAX_INLINE_LENGTH: usize = 200;

/// Zero-width characters (ZWSP / ZWNJ / ZWJ / word joiner / BOM).
fn is_zero_width(c: char) -> bool {
    matches!(c, '\u{200B}'..='\u{200D}' | '\u{2060}' | '\u{FEFF}')
}

/// C0/C1 control characters that are stripped by [`canonicalize`]. Newline,
/// carriage return, and tab are preserved and therefore excluded here.
fn is_removable_control(c: char) -> bool {
    matches!(c, '\u{0000}'..='\u{001F}' | '\u{007F}'..='\u{009F}')
        && !matches!(c, '\n' | '\r' | '\t')
}

/// Decorative markers dropped by [`match_key`].
fn is_decorative_marker(c: char) -> bool {
    matches!(c, '※' | '★' | '☆' | '◆' | '◇' | '◎' | '§' | '¶' | '†' | '‡')
}

/// Canonical form for storage/display. Applies NFKC normalization, then strips
/// zero-width characters and control characters (other than newline / tab).
pub fn canonicalize(input: &str) -> String {
    input
        .nfkc()
        .filter(|&c| !is_zero_width(c) && !is_removable_control(c))
        .collect()
}

/// Make one field-line of user input safe to handle. Truncates at the default max length.
pub fn sanitize_line(input: &str) -> String {
    sanitize_line_with_max(input, DEFAULT_MAX_INLINE_LENGTH)
}

/// [`sanitize_line`] with an explicit maximum length. Collapses runs of whitespace
/// and line breaks into a single space, trims, and truncates to `max_length` chars.
pub fn sanitize_line_with_max(input: &str, max_length: usize) -> String {
    let mut folded = String::new();
    let mut pending_space = false;
    for c in canonicalize(input).chars() {
        if c.is_whitespace() {
            pending_space = true;
        } else {
            if pending_space && !folded.is_empty() {
                folded.push(' ');
            }
            pending_space = false;
            folded.push(c);
        }
    }
    folded.chars().take(max_length).collect()
}

/// Key used for string comparison (e.g. matching category names). Flattens away
/// decorative markers, whitespace, and case. Never use for display (it drops information).
pub fn match_key(input: &str) -> String {
    canonicalize(input)
        .chars()
        .filter(|&c| !is_decorative_marker(c) && !c.is_whitespace())
        .collect::<String>()
        .to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- canonicalize ---

    #[test]
    fn canonicalize_applies_nfkc() {
        assert_eq!(canonicalize("ＡＢＣ１２３"), "ABC123");
        assert_eq!(canonicalize("Ⅰ Ⅱ Ⅲ Ⅳ Ⅴ Ⅵ"), "I II III IV V VI");
        assert_eq!(canonicalize("（テスト）"), "(テスト)");
    }

    #[test]
    fn canonicalize_removes_zero_width() {
        assert_eq!(
            canonicalize("a\u{200B}b\u{200C}c\u{200D}d\u{FEFF}e"),
            "abcde"
        );
    }

    #[test]
    fn canonicalize_removes_control_but_keeps_newline_tab() {
        assert_eq!(canonicalize("a\u{0001}b\u{007F}c"), "abc");
        assert_eq!(
            canonicalize("line1\nline2\tcol\rend"),
            "line1\nline2\tcol\rend"
        );
    }

    #[test]
    fn canonicalize_is_noop_on_clean_ascii() {
        assert_eq!(canonicalize("hello world"), "hello world");
    }

    // --- sanitize_line ---

    #[test]
    fn sanitize_line_collapses_breaks_and_whitespace() {
        assert_eq!(sanitize_line("a\n\nb\r\nc   d"), "a b c d");
    }

    #[test]
    fn sanitize_line_trims() {
        assert_eq!(sanitize_line("  foo  "), "foo");
    }

    #[test]
    fn sanitize_line_truncates_to_max() {
        let long = "a".repeat(DEFAULT_MAX_INLINE_LENGTH + 50);
        assert_eq!(
            sanitize_line(&long).chars().count(),
            DEFAULT_MAX_INLINE_LENGTH
        );
    }

    #[test]
    fn sanitize_line_accepts_custom_max() {
        assert_eq!(sanitize_line_with_max("abcdef", 3), "abc");
    }

    #[test]
    fn sanitize_line_normalises_and_strips_zero_width() {
        assert_eq!(sanitize_line("Ａ\u{200B}ｂ"), "Ab");
    }

    #[test]
    fn sanitize_line_blank_becomes_empty() {
        assert_eq!(sanitize_line("   \t \n "), "");
    }

    // --- match_key ---

    #[test]
    fn match_key_same_for_width_variants() {
        assert_eq!(match_key("基礎Ａ"), match_key("基礎A"));
        assert_eq!(match_key("ゼミナールⅤ・Ⅵ"), match_key("ゼミナールV・VI"));
    }

    #[test]
    fn match_key_strips_decorative_markers() {
        assert_eq!(match_key("政治学概論 ★"), "政治学概論");
        assert_eq!(match_key("大学政策論入門※"), "大学政策論入門");
    }

    #[test]
    fn match_key_lowercases() {
        assert_eq!(match_key("PF"), "pf");
    }

    #[test]
    fn match_key_removes_all_whitespace() {
        assert_eq!(match_key("共通 教育 / 初年次"), "共通教育/初年次");
    }
}
