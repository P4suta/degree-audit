//! Domain errors as values.
//!
//! Errors carry a stable machine [`ErrorCode`], a developer-facing English
//! `message`, and a `user_message`. User-facing wording stays here;
//! presentation layers may re-localize if needed.

use std::fmt;

use serde::{Deserialize, Serialize};

/// Stable, machine-readable error identifier. The wire form matches the
/// TypeScript `ErrorCode` string constants exactly (e.g. `DEGREE_AUDIT/CREDIT/NEGATIVE`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ErrorCode {
    #[serde(rename = "DEGREE_AUDIT/CREDIT/NEGATIVE")]
    CreditNegative,
    #[serde(rename = "DEGREE_AUDIT/CREDIT/NON_FINITE")]
    CreditNonFinite,
    #[serde(rename = "DEGREE_AUDIT/COURSE_ID/EMPTY")]
    CourseIdEmpty,
    #[serde(rename = "DEGREE_AUDIT/GPA/INVALID_SCORE")]
    GpaInvalidScore,
    #[serde(rename = "DEGREE_AUDIT/COURSE/INVALID_NAME")]
    CourseInvalidName,
    #[serde(rename = "DEGREE_AUDIT/STUDENT_PROFILE/INVALID")]
    StudentProfileInvalid,
    #[serde(rename = "DEGREE_AUDIT/RULESET/NOT_FOUND")]
    RuleSetNotFound,
    #[serde(rename = "DEGREE_AUDIT/RULESET/AMBIGUOUS")]
    RuleSetAmbiguous,
    #[serde(rename = "DEGREE_AUDIT/RAW_COURSE/MAPPING_FAILED")]
    RawCourseMappingFailed,
    #[serde(rename = "DEGREE_AUDIT/IMPORT/ALL_CATEGORIES_UNKNOWN")]
    ImportAllCategoriesUnknown,
    #[serde(rename = "DEGREE_AUDIT/IMPORT/UNSUPPORTED_FILE_FORMAT")]
    UnsupportedFileFormat,
    #[serde(rename = "DEGREE_AUDIT/IMPORT/FILE_READ_FAILED")]
    ImportFileReadFailed,
}

impl ErrorCode {
    /// The canonical wire string for this code.
    pub const fn as_str(self) -> &'static str {
        match self {
            ErrorCode::CreditNegative => "DEGREE_AUDIT/CREDIT/NEGATIVE",
            ErrorCode::CreditNonFinite => "DEGREE_AUDIT/CREDIT/NON_FINITE",
            ErrorCode::CourseIdEmpty => "DEGREE_AUDIT/COURSE_ID/EMPTY",
            ErrorCode::GpaInvalidScore => "DEGREE_AUDIT/GPA/INVALID_SCORE",
            ErrorCode::CourseInvalidName => "DEGREE_AUDIT/COURSE/INVALID_NAME",
            ErrorCode::StudentProfileInvalid => "DEGREE_AUDIT/STUDENT_PROFILE/INVALID",
            ErrorCode::RuleSetNotFound => "DEGREE_AUDIT/RULESET/NOT_FOUND",
            ErrorCode::RuleSetAmbiguous => "DEGREE_AUDIT/RULESET/AMBIGUOUS",
            ErrorCode::RawCourseMappingFailed => "DEGREE_AUDIT/RAW_COURSE/MAPPING_FAILED",
            ErrorCode::ImportAllCategoriesUnknown => "DEGREE_AUDIT/IMPORT/ALL_CATEGORIES_UNKNOWN",
            ErrorCode::UnsupportedFileFormat => "DEGREE_AUDIT/IMPORT/UNSUPPORTED_FILE_FORMAT",
            ErrorCode::ImportFileReadFailed => "DEGREE_AUDIT/IMPORT/FILE_READ_FAILED",
        }
    }
}

impl fmt::Display for ErrorCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

/// An error carried as a value across the domain. Never panics the caller.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DomainError {
    pub code: ErrorCode,
    /// Developer-facing English detail.
    pub message: String,
    /// End-user wording (Japanese).
    #[serde(rename = "userMessage")]
    pub user_message: String,
}

impl DomainError {
    pub fn new(
        code: ErrorCode,
        message: impl Into<String>,
        user_message: impl Into<String>,
    ) -> Self {
        Self {
            code,
            message: message.into(),
            user_message: user_message.into(),
        }
    }
}

impl fmt::Display for DomainError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}

impl std::error::Error for DomainError {}

/// Domain result alias for `Result<T, DomainError>`.
pub type DomainResult<T> = Result<T, DomainError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_code_wire_string_is_stable() {
        assert_eq!(
            ErrorCode::CreditNegative.as_str(),
            "DEGREE_AUDIT/CREDIT/NEGATIVE"
        );
        assert_eq!(
            serde_json::to_string(&ErrorCode::RuleSetAmbiguous).unwrap(),
            "\"DEGREE_AUDIT/RULESET/AMBIGUOUS\""
        );
    }

    #[test]
    fn domain_error_serializes_user_message_camel_case() {
        let e = DomainError::new(
            ErrorCode::CreditNegative,
            "dev detail",
            "単位数は 0 以上で指定してください。",
        );
        let json = serde_json::to_string(&e).unwrap();
        assert!(json.contains("\"userMessage\":\"単位数は 0 以上で指定してください。\""));
        assert!(json.contains("\"code\":\"DEGREE_AUDIT/CREDIT/NEGATIVE\""));
    }
}
