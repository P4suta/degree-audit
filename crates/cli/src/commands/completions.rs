//! The `completions` command: emit shell completions or a man page.

use std::io;

use clap::CommandFactory;
use clap_complete::generate;

use crate::cli::{Cli, CompletionsArgs};
use crate::error::CliError;

pub fn run(args: CompletionsArgs) -> Result<(), CliError> {
    let mut cmd = Cli::command();
    let name = cmd.get_name().to_owned();

    if args.man {
        clap_mangen::Man::new(cmd).render(&mut io::stdout())?;
        return Ok(());
    }

    if let Some(shell) = args.shell {
        generate(shell, &mut cmd, name, &mut io::stdout());
    }
    Ok(())
}
