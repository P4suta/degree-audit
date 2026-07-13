//! The import use case.
//!
//! Parses raw rows via a [`TranscriptSource`], maps them to courses, builds an
//! [`AcademicRecord`], and rejects imports where every course fell into `unknown`
//! (a strong signal the wrong document was supplied).

use std::sync::Arc;

use audit_domain::entity::academic_record::AcademicRecord;
use audit_domain::entity::student_profile::StudentProfile;
use audit_domain::error::{DomainError, ErrorCode};
use audit_domain::ruleset::RuleSet;
use audit_domain::value::SubjectKind;

use crate::mapper::{MappingFailure, map_raw_courses};
use crate::port::{RawCourse, TranscriptSource};

/// The result of a successful import.
#[derive(Debug, Clone)]
pub struct ImportOutcome {
    pub record: AcademicRecord,
    pub skipped: Vec<MappingFailure>,
    pub unknown_category_count: usize,
}

/// Reject the import when the unknown-category ratio reaches this threshold.
/// At 1.0 this only rejects "everything is unknown".
const UNKNOWN_CATEGORY_REJECTION_THRESHOLD: f64 = 1.0;

/// Run the import pipeline for the given source bytes, rule set, and profile.
pub fn import_transcript(
    bytes: &[u8],
    source: &dyn TranscriptSource,
    rule_set: &RuleSet,
    profile: StudentProfile,
) -> Result<ImportOutcome, DomainError> {
    let raws = source.parse(bytes)?;
    import_raw_courses(&raws, rule_set, profile)
}

/// Run the import pipeline over already-parsed raw rows.
///
/// The post-parse half of [`import_transcript`], split out so callers that have
/// already extracted the rows (e.g. from a single-pass PDF read) can reuse the
/// mapping and all-unknown rejection without re-parsing.
pub fn import_raw_courses(
    raws: &[RawCourse],
    rule_set: &RuleSet,
    profile: StudentProfile,
) -> Result<ImportOutcome, DomainError> {
    let mapping = map_raw_courses(raws, rule_set.category_map);

    let unknown_category_count = mapping
        .courses
        .iter()
        .filter(|c| c.kind() == SubjectKind::Unknown)
        .count();

    let total = mapping.courses.len();
    if total > 0 {
        let ratio = unknown_category_count as f64 / total as f64;
        if ratio >= UNKNOWN_CATEGORY_REJECTION_THRESHOLD {
            return Err(DomainError::new(
                ErrorCode::ImportAllCategoriesUnknown,
                format!("All {total} parsed courses fell into the 'unknown' category"),
                "取り込んだ科目の区分がひとつも認識できませんでした。別学部の書類が混入していないか、ファイルが壊れていないか確認してください。",
            ));
        }
    }

    let courses = mapping.courses.into_iter().map(Arc::new).collect();
    Ok(ImportOutcome {
        record: AcademicRecord::new(profile, courses),
        skipped: mapping.skipped,
        unknown_category_count,
    })
}
