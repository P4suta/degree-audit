//! The `info` command: splash plus build/format facts.

use std::io::Write as _;

use audit_domain::ruleset::Registry;

use crate::banner;
use crate::error::CliError;
use crate::theme::{Palette, paint};
use crate::ui;

pub fn run(palette: &Palette, use_color: bool) -> Result<(), CliError> {
    let registry = Registry::standard();
    let mut out = ui::out(use_color);
    write!(out, "{}", banner::splash(palette))?;
    writeln!(out)?;
    writeln!(
        out,
        "{} {}",
        paint(palette.muted, "バージョン:"),
        env!("CARGO_PKG_VERSION")
    )?;
    writeln!(out, "{} PDF 個別成績表", paint(palette.muted, "対応入力:"))?;
    writeln!(
        out,
        "{} {} 件",
        paint(palette.muted, "登録ルールセット:"),
        registry.rule_sets.len()
    )?;
    Ok(())
}
