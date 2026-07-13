//! A parse spinner that stays completely silent when stderr is not a terminal.

use std::io::IsTerminal;
use std::time::Duration;

use indicatif::{ProgressBar, ProgressStyle};

use crate::theme::{Palette, paint};

/// A running spinner (a no-op when stderr is redirected).
pub struct Spinner {
    bar: ProgressBar,
    visible: bool,
}

/// Start a spinner labelled `message`.
pub fn start(message: &str) -> Spinner {
    let visible = std::io::stderr().is_terminal();
    let bar = if visible {
        let bar = ProgressBar::new_spinner();
        bar.enable_steady_tick(Duration::from_millis(90));
        if let Ok(style) = ProgressStyle::with_template("{spinner:.cyan} {msg}") {
            bar.set_style(
                style.tick_strings(&["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏", "·"]),
            );
        }
        bar
    } else {
        ProgressBar::hidden()
    };
    bar.set_message(message.to_owned());
    Spinner { bar, visible }
}

impl Spinner {
    /// Stop the spinner and, when visible, leave a success line on stderr.
    pub fn done(self, message: &str, palette: &Palette) {
        self.bar.finish_and_clear();
        if self.visible {
            eprintln!("{} {}", paint(palette.success, "✔"), message);
        }
    }

    /// Stop the spinner silently (e.g. just before an error is rendered).
    pub fn clear(self) {
        self.bar.finish_and_clear();
    }
}
