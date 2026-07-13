//! The interactive wizard shown when `degree-audit` is run bare in a terminal.
//!
//! It greets with the splash, lets the user pick a transcript from the working
//! directory (or type a path), then delegates to `assess`, which auto-detects the
//! profile from the PDF header.

use std::fs;
use std::io::Write as _;
use std::path::{Path, PathBuf};

use inquire::{InquireError, Select, Text};

use crate::banner;
use crate::cli::AssessArgs;
use crate::commands::assess;
use crate::error::CliError;
use crate::theme::Palette;
use crate::ui;

const MANUAL: &str = "パスを直接入力…";

pub fn run(palette: &Palette, use_color: bool) -> Result<(), CliError> {
    {
        let mut out = ui::out(use_color);
        let _ = write!(out, "{}", banner::splash(palette));
    }
    let file = pick_file()?;
    assess::run(AssessArgs::from_file(file), palette, use_color)
}

fn pick_file() -> Result<PathBuf, CliError> {
    let mut choices = list_transcripts(Path::new("."));
    choices.push(MANUAL.to_owned());

    let chosen = Select::new("成績表ファイルを選択してください", choices)
        .prompt()
        .map_err(prompt_error)?;

    if chosen == MANUAL {
        let path = Text::new("ファイルパス:").prompt().map_err(prompt_error)?;
        Ok(PathBuf::from(path.trim()))
    } else {
        Ok(PathBuf::from(chosen))
    }
}

/// Names of `.pdf` files in `dir`, sorted.
fn list_transcripts(dir: &Path) -> Vec<String> {
    let mut names = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let is_transcript = path
                .extension()
                .is_some_and(|e| e.eq_ignore_ascii_case("pdf"));
            if is_transcript {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    names.push(name.to_owned());
                }
            }
        }
    }
    names.sort();
    names
}

fn prompt_error(e: InquireError) -> CliError {
    CliError::new(format!("対話入力を完了できませんでした: {e}")).with_code("PROMPT")
}
