//! Colour policy and the single source of styling for the CLI.
//!
//! Every style the CLI emits comes from a [`Palette`]. [`Palette::plain`] holds
//! only default (empty) styles, so painting through it is a byte-for-byte no-op —
//! that is what keeps `--color=never` output identical to the pre-colour CLI.

use anstyle::{AnsiColor, Color, Style};

/// When to emit ANSI colour.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum ColorChoice {
    /// Colour only an unredirected TTY with no `NO_COLOR`.
    #[default]
    Auto,
    /// Always colour.
    Always,
    /// Never colour.
    Never,
}

/// Decide whether to colourise, given the choice, whether the sink is a TTY, and
/// whether `NO_COLOR` is set.
pub fn use_color(choice: ColorChoice, is_tty: bool, no_color_env: bool) -> bool {
    match choice {
        ColorChoice::Always => true,
        ColorChoice::Never => false,
        ColorChoice::Auto => is_tty && !no_color_env,
    }
}

/// The CLI colour palette — the one place styles are defined.
#[derive(Debug, Clone, Copy)]
pub struct Palette {
    /// Whether structural flourishes (panels, bars, banner gradient) are drawn.
    pub enabled: bool,
    pub success: Style,
    pub warn: Style,
    pub error: Style,
    pub muted: Style,
    pub accent: Style,
    pub heading: Style,
}

const fn fg(color: AnsiColor) -> Style {
    Style::new().fg_color(Some(Color::Ansi(color)))
}

impl Palette {
    /// The colourful palette.
    pub fn colored() -> Palette {
        Palette {
            enabled: true,
            success: fg(AnsiColor::Green).bold(),
            warn: fg(AnsiColor::Yellow).bold(),
            error: fg(AnsiColor::Red).bold(),
            muted: fg(AnsiColor::BrightBlack),
            accent: fg(AnsiColor::Cyan),
            heading: Style::new().bold(),
        }
    }

    /// The plain palette: no styling and no flourishes. Output is byte-for-byte
    /// what the pre-colour CLI produced.
    pub fn plain() -> Palette {
        Palette {
            enabled: false,
            success: Style::new(),
            warn: Style::new(),
            error: Style::new(),
            muted: Style::new(),
            accent: Style::new(),
            heading: Style::new(),
        }
    }

    /// The palette matching a colour decision.
    pub fn resolve(enabled: bool) -> Palette {
        if enabled {
            Palette::colored()
        } else {
            Palette::plain()
        }
    }
}

/// Wrap `text` in `style`. When `style` is the default (empty) style this writes
/// no escape codes, so `paint(plain, s) == s`.
pub fn paint(style: Style, text: &str) -> String {
    format!("{style}{text}{style:#}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auto_colours_only_a_clean_tty() {
        assert!(use_color(ColorChoice::Auto, true, false));
        assert!(!use_color(ColorChoice::Auto, false, false));
        assert!(!use_color(ColorChoice::Auto, true, true));
    }

    #[test]
    fn always_and_never_ignore_the_tty() {
        assert!(use_color(ColorChoice::Always, false, true));
        assert!(!use_color(ColorChoice::Never, true, false));
    }

    #[test]
    fn plain_palette_paints_nothing() {
        let p = Palette::plain();
        assert_eq!(paint(p.success, "OK"), "OK");
        assert_eq!(paint(p.error, "実行"), "実行");
    }

    #[test]
    fn colored_palette_wraps_with_ansi() {
        let p = Palette::colored();
        let s = paint(p.error, "X");
        assert!(s.contains('X'));
        assert!(s.starts_with('\u{1b}'));
        assert_ne!(s, "X");
    }
}
