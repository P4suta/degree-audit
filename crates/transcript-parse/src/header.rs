//! Header extraction: faculty, course, and matriculation year.
//!
//! The page header prints the faculty (`…学部`), the course/program (`…コース`),
//! and the enrollment date as a Japanese era (`令和 4年 4月 1日入学`). The era date
//! is converted to a Western year through [`Wareki`].

use audit_domain::value::{Era, Wareki};

use crate::geometry::Piece;

/// The identifying header fields of a transcript.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TranscriptHeader {
    pub faculty: String,
    pub course: String,
    pub matriculation_year: u16,
}

/// Locate an era keyword and its following number, e.g. `令和 4年 … 入学` → 2022.
fn parse_matriculation(text: &str) -> Option<u16> {
    let compact: String = text.chars().filter(|c| !c.is_whitespace()).collect();
    if !compact.contains("入学") {
        return None;
    }
    for (keyword, era) in [
        ("令和", Era::Reiwa),
        ("平成", Era::Heisei),
        ("昭和", Era::Showa),
    ] {
        if let Some(idx) = compact.find(keyword) {
            let after = &compact[idx + keyword.len()..];
            let digits: String = after.chars().take_while(|c| c.is_ascii_digit()).collect();
            if let Ok(year) = digits.parse::<u8>() {
                return Some(Wareki::new(era, year).to_western().get());
            }
        }
    }
    None
}

/// Extract the header fields from a page's header-band pieces (the fragments above
/// the course table). `None` when a required field is missing.
pub fn extract_header(pieces: &[Piece]) -> Option<TranscriptHeader> {
    let mut faculty = None;
    let mut course = None;
    let mut matriculation_year = None;

    for piece in pieces {
        let text = piece.text.trim();
        if faculty.is_none() && text.ends_with("学部") {
            faculty = Some(text.to_string());
        }
        if course.is_none() && text.ends_with("コース") {
            course = Some(text.to_string());
        }
        if matriculation_year.is_none() {
            if let Some(year) = parse_matriculation(text) {
                matriculation_year = Some(year);
            }
        }
    }

    Some(TranscriptHeader {
        faculty: faculty?,
        course: course?,
        matriculation_year: matriculation_year?,
    })
}
