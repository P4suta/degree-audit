//! Output plumbing: TTY-aware streams and terminal geometry.
//!
//! Colour is decided once (see [`crate::theme`]) and threaded in as a bool. Streams
//! are `anstream::AutoStream`s, so when colour is off (or output is redirected) any
//! stray ANSI is stripped, and on Windows virtual-terminal processing is enabled
//! when colour is on.

pub mod panel;
pub mod spinner;

use std::io::{self, IsTerminal};

use anstream::AutoStream;

/// Whether stdout is a terminal.
pub fn stdout_is_tty() -> bool {
    io::stdout().is_terminal()
}

/// Whether stderr is a terminal.
pub fn stderr_is_tty() -> bool {
    io::stderr().is_terminal()
}

/// Whether stdin is a terminal (guards interactive prompts).
pub fn stdin_is_tty() -> bool {
    io::stdin().is_terminal()
}

/// Whether `NO_COLOR` is present and non-empty.
pub fn no_color_env() -> bool {
    std::env::var_os("NO_COLOR").is_some_and(|v| !v.is_empty())
}

fn choice(use_color: bool) -> anstream::ColorChoice {
    if use_color {
        anstream::ColorChoice::Always
    } else {
        anstream::ColorChoice::Never
    }
}

/// A stdout writer that honours the colour decision.
pub fn out(use_color: bool) -> AutoStream<io::Stdout> {
    AutoStream::new(io::stdout(), choice(use_color))
}

/// The stderr counterpart of [`out`].
pub fn err(use_color: bool) -> AutoStream<io::Stderr> {
    AutoStream::new(io::stderr(), choice(use_color))
}

/// The usable terminal width in columns, clamped to a sane range.
pub fn width() -> usize {
    terminal_size::terminal_size()
        .map(|(w, _)| w.0 as usize)
        .unwrap_or(80)
        .clamp(40, 120)
}
