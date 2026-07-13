//! The `rulesets` command: list the curated rule sets.

use std::io::Write as _;

use audit_domain::ruleset::{Registry, RuleSet};

use crate::error::CliError;
use crate::theme::{Palette, paint};
use crate::ui;

pub fn run(palette: &Palette, use_color: bool) -> Result<(), CliError> {
    let registry = Registry::standard();
    let mut out = ui::out(use_color);
    writeln!(
        out,
        "{}",
        paint(palette.heading, "適用可能な卒業要件ルールセット:")
    )?;
    for rs in &registry.rule_sets {
        let RuleSet { metadata, .. } = rs;
        writeln!(
            out,
            "  {}  {}  {}",
            paint(palette.accent, metadata.id),
            paint(
                palette.muted,
                &format!("(specificity {})", metadata.specificity)
            ),
            metadata.display_name,
        )?;
    }
    Ok(())
}
