//! The student whose transcript is being assessed. Ported from
//! `entities/student-profile.ts` (the Zod schema becomes explicit validation).
//!
//! `course_id` is the program/course label (e.g. "人文科学コース") that rule-set
//! `applicable_to` predicates inspect — not a [`crate::value::CourseId`].

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::error::{DomainError, DomainResult, ErrorCode};

const MATRICULATION_LOWER_BOUND: u16 = 1900;
const MATRICULATION_UPPER_BOUND: u16 = 2100;
const MAX_FIELD_LENGTH: usize = 100;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentProfile {
    pub faculty_id: String,
    pub course_id: String,
    pub matriculation_year: u16,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub extras: BTreeMap<String, String>,
}

impl StudentProfile {
    /// Build a validated profile. Strings are sanitized (single-line, capped) and
    /// must be non-blank; the matriculation year must fall in a sane range.
    pub fn new(
        faculty_id: &str,
        course_id: &str,
        matriculation_year: u16,
    ) -> DomainResult<StudentProfile> {
        let faculty_id = sanitized_field(faculty_id, "facultyId")?;
        let course_id = sanitized_field(course_id, "courseId")?;
        if !(MATRICULATION_LOWER_BOUND..=MATRICULATION_UPPER_BOUND).contains(&matriculation_year) {
            return Err(invalid(format!(
                "matriculationYear {matriculation_year} out of range"
            )));
        }
        Ok(StudentProfile {
            faculty_id,
            course_id,
            matriculation_year,
            extras: BTreeMap::new(),
        })
    }

    /// Attach a free-form extra field (e.g. student name/number from the header).
    pub fn with_extra(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.extras.insert(key.into(), value.into());
        self
    }
}

fn sanitized_field(value: &str, field: &str) -> DomainResult<String> {
    let cleaned = audit_text::sanitize_line_with_max(value, MAX_FIELD_LENGTH);
    if cleaned.is_empty() {
        return Err(invalid(format!("{field} must not be blank")));
    }
    Ok(cleaned)
}

fn invalid(detail: String) -> DomainError {
    DomainError::new(
        ErrorCode::StudentProfileInvalid,
        detail,
        "学生プロフィールの入力に誤りがあります。",
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_and_sanitizes() {
        let p = StudentProfile::new("  人文社会科学部 ", "人文科学コース", 2022).unwrap();
        assert_eq!(p.faculty_id, "人文社会科学部");
        assert_eq!(p.course_id, "人文科学コース");
        assert_eq!(p.matriculation_year, 2022);
    }

    #[test]
    fn rejects_blank_and_out_of_range() {
        assert_eq!(
            StudentProfile::new("", "x", 2022).unwrap_err().code,
            ErrorCode::StudentProfileInvalid
        );
        assert_eq!(
            StudentProfile::new("f", "c", 1800).unwrap_err().code,
            ErrorCode::StudentProfileInvalid
        );
    }
}
