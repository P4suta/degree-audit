//! The clap command-line surface: subcommands, aliases, short flags, and the
//! global colour switch.

use std::path::PathBuf;

use clap::{Args, Parser, Subcommand, ValueEnum};

use crate::theme::ColorChoice;

/// Colour choice as a clap value enum (mirrors [`crate::theme::ColorChoice`]).
#[derive(Debug, Clone, Copy, PartialEq, Eq, ValueEnum, Default)]
pub enum ColorArg {
    #[default]
    Auto,
    Always,
    Never,
}

impl From<ColorArg> for ColorChoice {
    fn from(c: ColorArg) -> ColorChoice {
        match c {
            ColorArg::Auto => ColorChoice::Auto,
            ColorArg::Always => ColorChoice::Always,
            ColorArg::Never => ColorChoice::Never,
        }
    }
}

fn help_styles() -> clap::builder::Styles {
    use anstyle::{AnsiColor, Style};
    clap::builder::Styles::styled()
        .header(Style::new().bold().fg_color(Some(AnsiColor::Cyan.into())))
        .usage(Style::new().bold().fg_color(Some(AnsiColor::Cyan.into())))
        .literal(Style::new().fg_color(Some(AnsiColor::Green.into())))
        .placeholder(Style::new().fg_color(Some(AnsiColor::BrightBlack.into())))
}

/// `degree-audit` — a modern terminal front-end for the graduation audit engine.
#[derive(Parser, Debug)]
#[command(
    name = "degree-audit",
    about = "卒業要件判定ツール — PDF 成績表から卒業判定を一気通貫で",
    version,
    styles = help_styles(),
    args_conflicts_with_subcommands = true,
    subcommand_negates_reqs = true,
)]
pub struct Cli {
    /// 成績表 PDF（省略すると対話モード）
    #[arg(value_name = "FILE")]
    pub file: Option<PathBuf>,

    #[command(subcommand)]
    pub command: Option<Command>,

    /// カラー表示: auto | always | never
    #[arg(long, value_enum, default_value_t = ColorArg::Auto, global = true)]
    pub color: ColorArg,
}

#[derive(Subcommand, Debug)]
pub enum Command {
    /// PDF 成績表から卒業判定を行う
    #[command(visible_alias = "a")]
    Assess(AssessArgs),

    /// PDF から生の科目行を JSON 抽出する（パーサのデバッグ用）
    #[command(visible_alias = "p")]
    Parse {
        /// 成績表 PDF のパス
        file: PathBuf,
    },

    /// 利用可能な卒業要件ルールセットを一覧表示する
    #[command(visible_aliases = ["ls", "rs"])]
    Rulesets,

    /// シェル補完スクリプトや man ページを生成する
    Completions(CompletionsArgs),

    /// 環境と表示能力を自己診断する
    Doctor,

    /// ビルド情報と対応形式を表示する
    Info,
}

/// Arguments for the `assess` subcommand.
#[derive(Args, Debug)]
pub struct AssessArgs {
    /// 成績表 PDF のパス
    pub file: PathBuf,
    /// Assessment を JSON で出力する
    #[arg(short = 'j', long)]
    pub json: bool,
    /// 要件ごとの診断を表示する
    #[arg(short = 'v', long)]
    pub verbose: bool,
    /// 入学年度を上書きする（既定: PDF ヘッダー、なければ 2022）
    #[arg(short = 'y', long)]
    pub year: Option<u16>,
    /// 学部を上書きする（既定: PDF ヘッダー）
    #[arg(short = 'f', long)]
    pub faculty: Option<String>,
    /// コースを上書きする（既定: PDF ヘッダー）
    #[arg(short = 'c', long)]
    pub course: Option<String>,
}

impl AssessArgs {
    /// The bare-invocation form: assess `file` with every default.
    pub fn from_file(file: PathBuf) -> AssessArgs {
        AssessArgs {
            file,
            json: false,
            verbose: false,
            year: None,
            faculty: None,
            course: None,
        }
    }
}

/// Arguments for the `completions` subcommand.
#[derive(Args, Debug)]
pub struct CompletionsArgs {
    /// 対象シェル（bash | zsh | fish | powershell | elvish）
    #[arg(value_enum, required_unless_present = "man")]
    pub shell: Option<clap_complete::Shell>,
    /// man ページ（roff）を出力する
    #[arg(long)]
    pub man: bool,
}
