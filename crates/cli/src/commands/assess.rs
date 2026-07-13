//! The `assess` command: PDF/JSON in, graduation report out.

use std::fs;
use std::io::Write as _;
use std::path::Path;
use std::sync::Arc;

use audit_app::{RawCourse, import_raw_courses, map_raw_courses};
use audit_domain::assess::{Assessment, assess};
use audit_domain::entity::academic_record::AcademicRecord;
use audit_domain::entity::student_profile::StudentProfile;
use audit_domain::ruleset::Registry;
use transcript_parse::parse_pdf_contents;

use crate::cli::AssessArgs;
use crate::error::CliError;
use crate::report::{ReportHeader, format_assessment};
use crate::theme::{Palette, paint};
use crate::ui;
use crate::ui::spinner;

const DEFAULT_FACULTY: &str = "人文社会科学部";
const DEFAULT_COURSE: &str = "人文科学コース";
const DEFAULT_YEAR: u16 = 2022;

/// The assessment plus the presentation context around it.
struct Prepared {
    assessment: Assessment,
    faculty: String,
    course: String,
    year: u16,
    skipped: usize,
    unknown: usize,
    course_count: usize,
}

pub fn run(args: AssessArgs, palette: &Palette, use_color: bool) -> Result<(), CliError> {
    let bytes = fs::read(&args.file)?;
    let pdf = is_pdf(&args.file, &bytes);

    let sp = spinner::start(if pdf {
        "成績表を解析中…"
    } else {
        "JSON を読み込み中…"
    });
    let prepared = match prepare(&bytes, pdf, &args) {
        Ok(prepared) => {
            sp.done(
                &format!("解析完了（{} 科目）", prepared.course_count),
                palette,
            );
            prepared
        }
        Err(e) => {
            sp.clear();
            return Err(e);
        }
    };

    emit(&prepared, args.json, args.verbose, palette, use_color)
}

/// Parse + map + assess, honouring header detection and CLI overrides.
fn prepare(bytes: &[u8], pdf: bool, args: &AssessArgs) -> Result<Prepared, CliError> {
    let registry = Registry::standard();

    if pdf {
        // A single extraction pass yields both the header and the course rows.
        let contents = parse_pdf_contents(bytes)?;
        let (header, courses) = contents.require_header()?;
        let faculty = args.faculty.clone().unwrap_or(header.faculty);
        let course = args.course.clone().unwrap_or(header.course);
        let year = args.year.unwrap_or(header.matriculation_year);
        let profile = StudentProfile::new(&faculty, &course, year)?;
        let rule_set = registry.resolve(&profile)?;
        let course_count = courses.len();
        let outcome = import_raw_courses(&courses, rule_set, profile)?;
        let assessment = assess(&outcome.record, rule_set);
        Ok(Prepared {
            assessment,
            faculty,
            course,
            year,
            skipped: outcome.skipped.len(),
            unknown: outcome.unknown_category_count,
            course_count,
        })
    } else {
        let raws: Vec<RawCourse> = serde_json::from_slice(bytes)?;
        let faculty = args
            .faculty
            .clone()
            .unwrap_or_else(|| DEFAULT_FACULTY.to_owned());
        let course = args
            .course
            .clone()
            .unwrap_or_else(|| DEFAULT_COURSE.to_owned());
        let year = args.year.unwrap_or(DEFAULT_YEAR);
        let profile = StudentProfile::new(&faculty, &course, year)?;
        let rule_set = registry.resolve(&profile)?;
        let mapping = map_raw_courses(&raws, rule_set.category_map);
        let skipped = mapping.skipped.len();
        let course_count = mapping.courses.len();
        let courses = mapping.courses.into_iter().map(Arc::new).collect();
        let record = AcademicRecord::new(profile, courses);
        let assessment = assess(&record, rule_set);
        Ok(Prepared {
            assessment,
            faculty,
            course,
            year,
            skipped,
            unknown: 0,
            course_count,
        })
    }
}

fn emit(
    prepared: &Prepared,
    json: bool,
    verbose: bool,
    palette: &Palette,
    use_color: bool,
) -> Result<(), CliError> {
    let mut out = ui::out(use_color);
    if json {
        // to_string_pretty only fails on non-string map keys, which we never have.
        writeln!(
            out,
            "{}",
            serde_json::to_string_pretty(&prepared.assessment).expect("assessment serializes")
        )?;
        return Ok(());
    }

    let header = ReportHeader {
        faculty: prepared.faculty.clone(),
        course: prepared.course.clone(),
        matriculation_year: prepared.year,
    };
    write!(
        out,
        "{}",
        format_assessment(&prepared.assessment, &header, verbose, palette)
    )?;

    let mut err = ui::err(use_color);
    if prepared.skipped > 0 {
        writeln!(
            err,
            "\n{} {} 行を取り込めませんでした（単位数の解釈不能など）。",
            paint(palette.warn, "注意:"),
            prepared.skipped
        )?;
    }
    if prepared.unknown > 0 {
        writeln!(
            err,
            "{} {} 件の科目が区分未判定です。",
            paint(palette.warn, "注意:"),
            prepared.unknown
        )?;
    }
    Ok(())
}

fn is_pdf(path: &Path, bytes: &[u8]) -> bool {
    bytes.starts_with(b"%PDF")
        || path
            .extension()
            .is_some_and(|e| e.eq_ignore_ascii_case("pdf"))
}
