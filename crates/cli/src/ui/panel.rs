//! Boxed panels and proportional progress bars.
//!
//! A [`Line`] tracks the *visible* width of its (possibly ANSI-styled, possibly
//! CJK) content, so [`panel`] can align a rounded frame correctly without measuring
//! escape bytes as columns.

use anstyle::Style;
use unicode_width::UnicodeWidthStr;

use crate::theme::{Palette, paint};
use crate::ui;

/// A proportional bar of `width` cells filled to `actual / required`.
///
/// A requirement with `required == 0` is trivially met and renders full.
pub fn bar(actual: u32, required: u32, width: usize) -> String {
    let width = width.max(1);
    let filled = if required == 0 {
        width
    } else {
        let ratio = (f64::from(actual) / f64::from(required)).clamp(0.0, 1.0);
        (ratio * width as f64).round() as usize
    }
    .min(width);
    format!("{}{}", "█".repeat(filled), "░".repeat(width - filled))
}

/// One panel line: rendered content plus its visible column width.
#[derive(Debug, Clone, Default)]
pub struct Line {
    rendered: String,
    width: usize,
}

impl Line {
    /// An empty line.
    pub fn new() -> Line {
        Line::default()
    }

    /// A line built from an already-rendered string of known visible `width`
    /// (e.g. a gradient wordmark).
    pub fn raw(rendered: String, width: usize) -> Line {
        Line { rendered, width }
    }

    /// Append `text` painted with `style`. Width counts the visible text only.
    #[must_use]
    pub fn push(mut self, style: Style, text: &str) -> Line {
        self.rendered.push_str(&paint(style, text));
        self.width += UnicodeWidthStr::width(text);
        self
    }

    /// The visible column width of the line.
    pub fn width(&self) -> usize {
        self.width
    }
}

/// Draw `lines` inside a rounded box, coloured with `palette.accent`.
pub fn panel(lines: &[Line], palette: &Palette) -> String {
    let inner = lines
        .iter()
        .map(Line::width)
        .max()
        .unwrap_or(0)
        .clamp(1, ui::width().saturating_sub(4).max(1));
    let border = palette.accent;
    let rule = "─".repeat(inner + 2);

    let mut out = String::new();
    out.push_str(&paint(border, &format!("╭{rule}╮")));
    out.push('\n');
    for line in lines {
        let pad = " ".repeat(inner.saturating_sub(line.width));
        out.push_str(&paint(border, "│ "));
        out.push_str(&line.rendered);
        out.push_str(&pad);
        out.push_str(&paint(border, " │"));
        out.push('\n');
    }
    out.push_str(&paint(border, &format!("╰{rule}╯")));
    out.push('\n');
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bar_fills_proportionally() {
        assert_eq!(bar(12, 20, 10), "██████░░░░");
        assert_eq!(bar(0, 20, 10), "░░░░░░░░░░");
        assert_eq!(bar(20, 20, 10), "██████████");
    }

    #[test]
    fn bar_clamps_and_handles_zero_requirement() {
        assert_eq!(bar(30, 20, 10), "██████████");
        assert_eq!(bar(0, 0, 6), "██████");
    }

    #[test]
    fn plain_panel_frames_content_without_ansi() {
        let lines = [Line::new().push(Style::new(), "hi")];
        let out = panel(&lines, &Palette::plain());
        assert!(!out.contains('\u{1b}'));
        assert!(out.contains("╭"));
        assert!(out.contains("│ hi │"));
        assert!(out.contains("╰"));
    }
}
