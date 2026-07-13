//! The `parse` command: dump raw course rows as JSON (parser debugging).

use std::fs;
use std::io::Write as _;
use std::path::PathBuf;

use crate::error::CliError;
use crate::ui;

pub fn run(file: PathBuf, use_color: bool) -> Result<(), CliError> {
    let bytes = fs::read(&file)?;
    let raws = transcript_parse::parse_pdf(&bytes)?;
    let mut out = ui::out(use_color);
    writeln!(out, "{}", serde_json::to_string_pretty(&raws)?)?;
    Ok(())
}
