//! A stable course identifier.

use std::fmt;

use serde::{Deserialize, Serialize};

use crate::error::{DomainError, DomainResult, ErrorCode};

/// A non-empty course identifier. Serializes transparently as a string.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct CourseId(String);

impl CourseId {
    /// Construct from a raw string, trimming surrounding whitespace. Empty (after
    /// trimming) input is rejected.
    pub fn of(value: impl Into<String>) -> DomainResult<CourseId> {
        let value = value.into();
        let trimmed = value.trim();
        if trimmed.is_empty() {
            return Err(DomainError::new(
                ErrorCode::CourseIdEmpty,
                "CourseId must not be empty",
                "科目 ID が空です。",
            ));
        }
        Ok(CourseId(trimmed.to_owned()))
    }

    /// The underlying string.
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for CourseId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trims_and_accepts_nonempty() {
        let id = CourseId::of("  abc::2022 ").unwrap();
        assert_eq!(id.as_str(), "abc::2022");
    }

    #[test]
    fn rejects_blank() {
        let err = CourseId::of("   ").unwrap_err();
        assert_eq!(err.code, ErrorCode::CourseIdEmpty);
    }

    #[test]
    fn serializes_transparently() {
        let id = CourseId::of("x1").unwrap();
        assert_eq!(serde_json::to_string(&id).unwrap(), "\"x1\"");
    }
}
