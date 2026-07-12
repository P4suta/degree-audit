//! `transcript-parse` — turn a 高知大学 個別成績表 PDF into [`RawCourse`] rows.
//!
//! The crate sits above [`pdf_glyphs`] (positioned text fragments) and below
//! `audit_app` (the `TranscriptSource` port). It performs a purely geometric
//! reconstruction of the two-column course table ([`geometry`]), then interprets
//! each row as either a category header or a course ([`course`]), producing the
//! all-strings [`RawCourse`] DTO the domain mapper consumes.
//!
//! # Example
//! ```no_run
//! use transcript_parse::{PdfTranscript, parse_pdf};
//! use audit_app::TranscriptSource;
//!
//! let bytes = std::fs::read("transcript.pdf").unwrap();
//! let rows = parse_pdf(&bytes).unwrap();          // free function
//! let rows2 = PdfTranscript.parse(&bytes).unwrap(); // via the port
//! # let _ = (rows, rows2);
//! ```

mod course;
mod geometry;
mod header;

use audit_app::{RawCourse, TranscriptSource};
use audit_domain::error::{DomainError, ErrorCode};

use course::{Section, apply_header, parse_course_row, to_raw_course};

pub use header::TranscriptHeader;

/// Fragments at or above this baseline `y` on page 1 form the header band.
const HEADER_BAND_Y: f32 = 696.0;

/// Map a `pdf-glyphs` extraction failure into a domain error.
fn extraction_error(err: pdf_glyphs::ExtractError) -> DomainError {
    DomainError::new(
        ErrorCode::UnsupportedFileFormat,
        format!("failed to extract text fragments from PDF: {err}"),
        "PDF ファイルを読み取れませんでした。対応した個別成績表の PDF か確認してください。",
    )
}

/// Parse a 個別成績表 PDF into raw course rows.
///
/// Category headers are consumed by the section state machine and never emitted;
/// every other well-formed course row becomes a [`RawCourse`] carrying the current
/// section breadcrumb in `raw_category_label`.
pub fn parse_pdf(bytes: &[u8]) -> Result<Vec<RawCourse>, DomainError> {
    let fragments = pdf_glyphs::extract(bytes).map_err(extraction_error)?;
    let rows = geometry::reconstruct_rows(&fragments);

    let mut section = Section::default();
    let mut courses = Vec::new();
    for row in &rows {
        if apply_header(&mut section, &row.joined()) {
            continue;
        }
        if let Some(parsed) = parse_course_row(&row.texts()) {
            courses.push(to_raw_course(parsed, &section));
        }
    }
    Ok(courses)
}

/// Parse the identifying header (faculty / course / matriculation year) from a
/// 個別成績表 PDF.
pub fn parse_header(bytes: &[u8]) -> Result<TranscriptHeader, DomainError> {
    let fragments = pdf_glyphs::extract(bytes).map_err(extraction_error)?;
    let pieces: Vec<geometry::Piece> = fragments
        .iter()
        .filter(|f| f.page == 1 && f.y >= HEADER_BAND_Y)
        .map(|f| geometry::Piece {
            text: f.text.clone(),
        })
        .collect();
    header::extract_header(&pieces).ok_or_else(|| {
        DomainError::new(
            ErrorCode::UnsupportedFileFormat,
            "could not locate faculty / course / matriculation year in the PDF header",
            "PDF のヘッダーから学部・コース・入学年を読み取れませんでした。",
        )
    })
}

/// The PDF transcript adapter: the driven [`TranscriptSource`] port over
/// [`parse_pdf`].
#[derive(Debug, Clone, Copy, Default)]
pub struct PdfTranscript;

impl TranscriptSource for PdfTranscript {
    fn parse(&self, bytes: &[u8]) -> Result<Vec<RawCourse>, DomainError> {
        parse_pdf(bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::course::{ParsedRow, Section, apply_header, parse_course_row};

    fn texts(row: &[&str]) -> Vec<String> {
        row.iter().map(|s| s.to_string()).collect()
    }

    // --- trailing-token parser ---

    #[test]
    fn parses_normal_course_with_score() {
        let row = texts(&[
            "国際社会研究入門",
            "斎藤 昌人, 他",
            "2",
            "89",
            "優",
            "22",
            "2",
        ]);
        let p = parse_course_row(&row).expect("parse");
        assert_eq!(
            p,
            ParsedRow {
                name: "国際社会研究入門".to_string(),
                teacher: Some("斎藤 昌人, 他".to_string()),
                credit_text: "2".to_string(),
                score_text: Some("89".to_string()),
                grade_text: "優".to_string(),
                year_text: "2022".to_string(),
                term_text: "2".to_string(),
            }
        );
    }

    #[test]
    fn parses_eight_credit_thesis_without_score() {
        // The 8-credit thesis is in progress (履) and has no 評点.
        let row = texts(&[
            "卒業論文・ゼミナールⅤ・Ⅵ",
            "佐野 泰之",
            "8",
            "履",
            "26",
            "2",
        ]);
        let p = parse_course_row(&row).expect("parse");
        assert_eq!(p.credit_text, "8");
        assert_eq!(p.score_text, None);
        assert_eq!(p.grade_text, "履修中");
        assert_eq!(p.year_text, "2026");
        assert_eq!(p.name, "卒業論文・ゼミナールⅤ・Ⅵ");
    }

    #[test]
    fn parses_blank_score_general_course() {
        // A 認定 course with a blank 評点: only one integer (the credit) remains.
        let row = texts(&["認定科目", "担当 教員", "2", "認", "23", "1"]);
        let p = parse_course_row(&row).expect("parse");
        assert_eq!(p.credit_text, "2");
        assert_eq!(p.score_text, None);
        assert_eq!(p.grade_text, "認定");
    }

    #[test]
    fn parses_credit_before_teacher_run() {
        // Long teacher name pushes the credit ahead of it in x-order.
        let row = texts(&[
            "英会話I （人文社会科学部）",
            "1",
            "ジョンソン マーク",
            "84",
            "優",
            "22",
            "1",
        ]);
        let p = parse_course_row(&row).expect("parse");
        assert_eq!(p.credit_text, "1");
        assert_eq!(p.score_text, Some("84".to_string()));
        assert_eq!(p.name, "英会話I （人文社会科学部）");
        assert_eq!(p.teacher, Some("ジョンソン マーク".to_string()));
    }

    #[test]
    fn rejects_rows_without_trailing_grade() {
        // Footer summary row: numbers all the way, no grade kanji.
        assert!(parse_course_row(&texts(&["修得単位", "138", "54", "12", "1"])).is_none());
    }

    #[test]
    fn rejects_rows_with_out_of_range_term() {
        assert!(parse_course_row(&texts(&["名前", "先生", "2", "優", "22", "9"])).is_none());
    }

    #[test]
    fn expands_two_digit_year() {
        for (yy, expected) in [("22", "2022"), ("23", "2023"), ("26", "2026")] {
            let row = texts(&["名前", "先生", "2", "80", "優", yy, "1"]);
            assert_eq!(parse_course_row(&row).unwrap().year_text, expected);
        }
    }

    // --- section state machine ---

    fn breadcrumb_after(headers: &[&str]) -> String {
        let mut section = Section::default();
        for h in headers {
            assert!(apply_header(&mut section, h), "not recognized: {h}");
        }
        section.breadcrumb()
    }

    #[test]
    fn primary_breadcrumb_keeps_top() {
        assert_eq!(
            breadcrumb_after(&["[共通教育]", "《初年次科目》"]),
            "共通教育 / 初年次科目"
        );
    }

    #[test]
    fn liberal_field_breadcrumb_keeps_group_and_leaf() {
        assert_eq!(
            breadcrumb_after(&["[共通教育]", "《教養科目》", "〈人文分野〉"]),
            "共通教育 / 教養科目 / 人文分野"
        );
    }

    #[test]
    fn child_group_retains_parent_group() {
        // 基礎科目Ａ群 is a child leaf of プラットフォーム科目; both must survive.
        assert_eq!(
            breadcrumb_after(&["[専門科目]", "《プラットフォーム科目》", "《基礎科目Ａ群》"]),
            "専門科目 / プラットフォーム科目 / 基礎科目Ａ群"
        );
    }

    #[test]
    fn new_major_group_resets_leaf() {
        // Moving from PF/発展 into ゼミナール科目 must drop the 発展 leaf.
        assert_eq!(
            breadcrumb_after(&[
                "[専門科目]",
                "《プラットフォーム科目》",
                "《発展科目》",
                "《ゼミナール科目》",
            ]),
            "専門科目 / ゼミナール科目"
        );
    }

    #[test]
    fn elective_other_faculty_breadcrumb() {
        assert_eq!(
            breadcrumb_after(&["[専門科目]", "《選択科目》", "《他学部専門科目》"]),
            "専門科目 / 選択科目 / 他学部専門科目"
        );
    }

    #[test]
    fn new_top_resets_group_and_leaf() {
        assert_eq!(
            breadcrumb_after(&["[共通教育]", "《教養科目》", "〈人文分野〉", "[専門科目]"]),
            "専門科目"
        );
    }

    #[test]
    fn course_row_is_not_a_header() {
        let mut section = Section::default();
        assert!(!apply_header(
            &mut section,
            "国際社会研究入門斎藤 昌人, 他2 89 優 22 2"
        ));
    }
}
