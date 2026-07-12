//! The transcript-source port and its boundary DTO. Ported from
//! `infrastructure/parsers/transcript-parser.ts`.
//!
//! `RawCourse` is an all-strings DTO — the parse boundary. Adapters (PDF/MHTML/
//! text) implement [`TranscriptSource`]; the domain never sees them, only the
//! typed `Course` the mapper produces.

use audit_domain::DomainError;
use serde::{Deserialize, Serialize};

/// A raw, unparsed course row as extracted from a transcript document.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct RawCourse {
    pub raw_category_label: String,
    pub name: String,
    pub credit_text: String,
    pub grade_text: String,
    pub year_text: Option<String>,
    pub teacher: Option<String>,
    pub score_text: Option<String>,
    pub course_code: Option<String>,
}

/// A source of transcript rows. Implemented by format-specific adapters.
pub trait TranscriptSource {
    fn parse(&self, bytes: &[u8]) -> Result<Vec<RawCourse>, DomainError>;
}
