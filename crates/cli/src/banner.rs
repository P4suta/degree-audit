//! The startup splash: a gradient wordmark inside a rounded frame.

use anstyle::{Color, RgbColor, Style};
use unicode_width::UnicodeWidthStr;

use crate::theme::{Palette, paint};
use crate::ui::panel::{self, Line};

const WORDMARK: &str = "◆ DEGREE·AUDIT";
const TAGLINE: &str = "PDF → 卒業判定を、ターミナルで一気通貫";

/// Render the splash panel for the given palette.
pub fn splash(palette: &Palette) -> String {
    let version = env!("CARGO_PKG_VERSION");
    let lines = [
        Line::raw(
            gradient(WORDMARK, palette.enabled),
            UnicodeWidthStr::width(WORDMARK),
        ),
        Line::new().push(palette.muted, &format!("卒業要件判定ツール · v{version}")),
        Line::new().push(palette.muted, TAGLINE),
    ];
    panel::panel(&lines, palette)
}

/// A left-to-right cyan→magenta gradient over `text` (identity when disabled).
fn gradient(text: &str, enabled: bool) -> String {
    if !enabled {
        return text.to_owned();
    }
    let from = (0u8, 229, 255);
    let to = (255u8, 64, 229);
    let chars: Vec<char> = text.chars().collect();
    let denom = chars.len().saturating_sub(1).max(1) as f32;
    let mut out = String::new();
    for (i, ch) in chars.iter().enumerate() {
        let t = i as f32 / denom;
        let color = RgbColor(
            lerp(from.0, to.0, t),
            lerp(from.1, to.1, t),
            lerp(from.2, to.2, t),
        );
        let style = Style::new().fg_color(Some(Color::Rgb(color))).bold();
        out.push_str(&paint(style, &ch.to_string()));
    }
    out
}

fn lerp(a: u8, b: u8, t: f32) -> u8 {
    (f32::from(a) + (f32::from(b) - f32::from(a)) * t).round() as u8
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plain_splash_has_no_ansi_and_names_the_tool() {
        let s = splash(&Palette::plain());
        assert!(!s.contains('\u{1b}'));
        assert!(s.contains("DEGREE·AUDIT"));
        assert!(s.contains(env!("CARGO_PKG_VERSION")));
    }

    #[test]
    fn gradient_disabled_is_identity() {
        assert_eq!(gradient("ABC", false), "ABC");
    }

    #[test]
    fn gradient_enabled_adds_colour_but_keeps_text() {
        let g = gradient("AB", true);
        assert!(g.starts_with('\u{1b}'));
        assert!(g.contains('A') && g.contains('B'));
    }
}
