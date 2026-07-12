//! degree-audit — a terminal front-end for the graduation audit engine.
//!
//! A composition root: it wires raw input (an official PDF transcript, or a JSON
//! array of the `RawCourse` boundary DTO) to `audit_app`/`audit_domain` and
//! renders the result.

mod diagnostic;
mod report;

use std::fs;
use std::path::PathBuf;
use std::process::ExitCode;
use std::sync::Arc;

use audit_app::{RawCourse, import_transcript, map_raw_courses};
use audit_domain::assess::{Assessment, assess};
use audit_domain::entity::academic_record::AcademicRecord;
use audit_domain::entity::student_profile::StudentProfile;
use audit_domain::ruleset::{Registry, RuleSet};
use clap::{Parser, Subcommand};
use transcript_parse::{PdfTranscript, parse_header};

use report::{ReportHeader, format_assessment};

const DEFAULT_FACULTY: &str = "人文社会科学部";
const DEFAULT_COURSE: &str = "人文科学コース";
const DEFAULT_YEAR: u16 = 2022;

#[derive(Parser)]
#[command(name = "degree-audit", about = "卒業要件判定ツール", version)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Assess graduation from an official PDF transcript or a JSON array of RawCourse.
    Assess {
        /// Path to a `.pdf` transcript or a `.json` array of RawCourse objects.
        file: PathBuf,
        /// Emit the full Assessment as JSON instead of a report.
        #[arg(long)]
        json: bool,
        /// Show per-requirement diagnostics.
        #[arg(long)]
        verbose: bool,
        /// Override the matriculation year (default: from the PDF header, else 2022).
        #[arg(long)]
        year: Option<u16>,
        /// Override the faculty (default: from the PDF header).
        #[arg(long)]
        faculty: Option<String>,
        /// Override the course (default: from the PDF header).
        #[arg(long)]
        course: Option<String>,
    },
    /// Extract the raw course rows from a PDF as JSON (parser debugging).
    Parse {
        /// Path to a `.pdf` transcript.
        file: PathBuf,
    },
    /// List the available rule sets.
    Rulesets,
}

fn main() -> ExitCode {
    match run(Cli::parse()) {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("エラー: {e}");
            ExitCode::FAILURE
        }
    }
}

fn run(cli: Cli) -> Result<(), Box<dyn std::error::Error>> {
    match cli.command {
        Command::Assess {
            file,
            json,
            verbose,
            year,
            faculty,
            course,
        } => run_assess(file, json, verbose, year, faculty, course),
        Command::Parse { file } => run_parse(file),
        Command::Rulesets => run_rulesets(),
    }
}

fn is_pdf(path: &std::path::Path, bytes: &[u8]) -> bool {
    bytes.starts_with(b"%PDF")
        || path
            .extension()
            .is_some_and(|e| e.eq_ignore_ascii_case("pdf"))
}

fn run_assess(
    file: PathBuf,
    json: bool,
    verbose: bool,
    year: Option<u16>,
    faculty: Option<String>,
    course: Option<String>,
) -> Result<(), Box<dyn std::error::Error>> {
    let bytes = fs::read(&file)?;
    let registry = Registry::standard();

    if is_pdf(&file, &bytes) {
        // Resolve the profile from the header, honoring any overrides.
        let header = parse_header(&bytes)?;
        let faculty = faculty.unwrap_or(header.faculty);
        let course = course.unwrap_or(header.course);
        let year = year.unwrap_or(header.matriculation_year);
        let profile = StudentProfile::new(&faculty, &course, year)?;
        let rule_set = registry.resolve(&profile)?;

        let outcome = import_transcript(&bytes, &PdfTranscript, rule_set, profile)?;
        let assessment = assess(&outcome.record, rule_set);
        emit(
            &assessment,
            json,
            verbose,
            &faculty,
            &course,
            year,
            outcome.skipped.len(),
            outcome.unknown_category_count,
        );
    } else {
        // JSON array of RawCourse; profile comes from flags with sensible defaults.
        let raws: Vec<RawCourse> = serde_json::from_slice(&bytes)?;
        let faculty = faculty.unwrap_or_else(|| DEFAULT_FACULTY.to_owned());
        let course = course.unwrap_or_else(|| DEFAULT_COURSE.to_owned());
        let year = year.unwrap_or(DEFAULT_YEAR);
        let profile = StudentProfile::new(&faculty, &course, year)?;
        let rule_set = registry.resolve(&profile)?;

        let mapping = map_raw_courses(&raws, rule_set.category_map);
        let skipped = mapping.skipped.len();
        let courses = mapping.courses.into_iter().map(Arc::new).collect();
        let record = AcademicRecord::new(profile, courses);
        let assessment = assess(&record, rule_set);
        emit(
            &assessment,
            json,
            verbose,
            &faculty,
            &course,
            year,
            skipped,
            0,
        );
    }
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn emit(
    assessment: &Assessment,
    json: bool,
    verbose: bool,
    faculty: &str,
    course: &str,
    year: u16,
    skipped: usize,
    unknown: usize,
) {
    if json {
        // to_string_pretty only fails on non-string map keys, which we never have.
        println!("{}", serde_json::to_string_pretty(assessment).unwrap());
        return;
    }
    let header = ReportHeader {
        faculty: faculty.to_owned(),
        course: course.to_owned(),
        matriculation_year: year,
    };
    print!("{}", format_assessment(assessment, &header, verbose));
    if skipped > 0 {
        eprintln!("\n注意: {skipped} 行を取り込めませんでした（単位数の解釈不能など）。");
    }
    if unknown > 0 {
        eprintln!("注意: {unknown} 件の科目が区分未判定です。");
    }
}

fn run_parse(file: PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    let bytes = fs::read(&file)?;
    let raws = transcript_parse::parse_pdf(&bytes)?;
    println!("{}", serde_json::to_string_pretty(&raws)?);
    Ok(())
}

fn run_rulesets() -> Result<(), Box<dyn std::error::Error>> {
    let registry = Registry::standard();
    println!("適用可能な卒業要件ルールセット:");
    for rs in &registry.rule_sets {
        let RuleSet { metadata, .. } = rs;
        println!(
            "  {} (specificity {})  — {}",
            metadata.id, metadata.specificity, metadata.display_name
        );
    }
    Ok(())
}
