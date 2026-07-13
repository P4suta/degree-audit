//! The `doctor` command: report the environment and display capabilities.

use std::io::Write as _;

use crate::error::CliError;
use crate::theme::{Palette, paint};
use crate::ui;

pub fn run(palette: &Palette, use_color: bool) -> Result<(), CliError> {
    let mut out = ui::out(use_color);
    writeln!(out, "{}", paint(palette.heading, "degree-audit doctor"))?;

    let checks = [
        ("stdout is a terminal", ui::stdout_is_tty()),
        ("stderr is a terminal", ui::stderr_is_tty()),
        ("stdin is a terminal", ui::stdin_is_tty()),
        ("colour enabled", use_color),
        ("NO_COLOR set", ui::no_color_env()),
    ];
    for (label, ok) in checks {
        let (sym, style) = if ok {
            ("✔", palette.success)
        } else {
            ("·", palette.muted)
        };
        writeln!(out, "  {} {label}", paint(style, sym))?;
    }
    writeln!(
        out,
        "  {} terminal width: {} 桁",
        paint(palette.accent, "→"),
        ui::width()
    )?;
    Ok(())
}
