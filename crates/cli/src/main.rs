//! degree-audit — a modern terminal front-end for the graduation audit engine.
//!
//! A composition root: it wires raw input (an official PDF transcript) to
//! `audit_app`/`audit_domain` and renders the result. All presentation concerns
//! (colour, panels, spinners, prompts, rich errors) live here in the CLI crate;
//! the core stays pure.

mod banner;
mod cli;
mod commands;
mod diagnostic;
mod error;
mod interactive;
mod report;
mod theme;
mod ui;

use std::io::Write as _;
use std::process::ExitCode;

use clap::{CommandFactory, Parser};
use miette::{GraphicalReportHandler, GraphicalTheme};

use cli::{AssessArgs, Cli, Command};
use error::CliError;
use theme::{ColorChoice, Palette, use_color};

fn main() -> ExitCode {
    let cli = Cli::parse();
    let choice: ColorChoice = cli.color.into();
    let colored = use_color(choice, ui::stdout_is_tty(), ui::no_color_env());

    match run(cli, colored) {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            render_error(&e, colored);
            ExitCode::FAILURE
        }
    }
}

fn run(cli: Cli, colored: bool) -> Result<(), CliError> {
    let palette = Palette::resolve(colored);
    match cli.command {
        Some(Command::Assess(args)) => commands::assess::run(args, &palette, colored),
        Some(Command::Parse { file }) => commands::parse::run(file, colored),
        Some(Command::Rulesets) => commands::rulesets::run(&palette, colored),
        Some(Command::Completions(args)) => commands::completions::run(args),
        Some(Command::Doctor) => commands::doctor::run(&palette, colored),
        Some(Command::Info) => commands::info::run(&palette, colored),
        None => match cli.file {
            Some(file) => commands::assess::run(AssessArgs::from_file(file), &palette, colored),
            None => entry(&palette, colored),
        },
    }
}

/// The bare-invocation entry point: interactive wizard on a TTY, help otherwise.
fn entry(palette: &Palette, colored: bool) -> Result<(), CliError> {
    if ui::stdin_is_tty() && ui::stdout_is_tty() {
        interactive::run(palette, colored)
    } else {
        let mut out = ui::out(colored);
        let _ = write!(out, "{}", Cli::command().render_help());
        Ok(())
    }
}

/// Render a CLI error with miette's graphical handler, honouring the colour choice.
fn render_error(e: &CliError, colored: bool) {
    let handler = GraphicalReportHandler::new().with_theme(if colored {
        GraphicalTheme::unicode()
    } else {
        GraphicalTheme::unicode_nocolor()
    });
    let mut buf = String::new();
    let _ = handler.render_report(&mut buf, e);
    let mut err = ui::err(colored);
    let _ = write!(err, "{buf}");
}
