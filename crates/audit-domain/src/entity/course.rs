//! A single taken course. Ported from `entities/course.ts`.

use serde::{Deserialize, Serialize};

use crate::error::{DomainError, DomainResult, ErrorCode};
use crate::value::{Credit, Grade, SubjectCategory, SubjectKind};

/// A course on a transcript. Optional fields are omitted from the wire form when
/// absent, matching the TS `Course` shape (camelCase keys).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Course {
    pub id: crate::value::CourseId,
    pub name: String,
    pub credit: Credit,
    pub grade: Grade,
    pub category: SubjectCategory,
    pub raw_category_label: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub year: Option<u16>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub teacher: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub score: Option<u16>,
}

/// Fields needed to build a [`Course`]. Mirrors `CourseInput`.
pub struct CourseInput {
    pub id: crate::value::CourseId,
    pub name: String,
    pub credit: Credit,
    pub grade: Grade,
    pub category: SubjectCategory,
    pub raw_category_label: String,
    pub year: Option<u16>,
    pub teacher: Option<String>,
    pub score: Option<u16>,
}

impl Course {
    /// Build a course, rejecting a blank name (trimmed).
    pub fn of(input: CourseInput) -> DomainResult<Course> {
        let name = input.name.trim();
        if name.is_empty() {
            return Err(DomainError::new(
                ErrorCode::CourseInvalidName,
                "Course name must not be empty",
                "科目名が空です。",
            ));
        }
        Ok(Course {
            id: input.id,
            name: name.to_owned(),
            credit: input.credit,
            grade: input.grade,
            category: input.category,
            raw_category_label: input.raw_category_label,
            year: input.year,
            teacher: input.teacher,
            score: input.score,
        })
    }

    /// The field-less category discriminant of this course.
    pub fn kind(&self) -> SubjectKind {
        self.category.kind()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::value::CourseId;

    fn sample() -> CourseInput {
        CourseInput {
            id: CourseId::of("c1").unwrap(),
            name: "  情報処理  ".to_owned(),
            credit: Credit::new(2),
            grade: Grade::Yu,
            category: SubjectCategory::CommonPrimary,
            raw_category_label: "共通教育 / 初年次".to_owned(),
            year: Some(2022),
            teacher: Some("野田 稔".to_owned()),
            score: Some(99),
        }
    }

    #[test]
    fn trims_name() {
        let c = Course::of(sample()).unwrap();
        assert_eq!(c.name, "情報処理");
    }

    #[test]
    fn rejects_blank_name() {
        let mut input = sample();
        input.name = "   ".to_owned();
        assert_eq!(
            Course::of(input).unwrap_err().code,
            ErrorCode::CourseInvalidName
        );
    }

    #[test]
    fn omits_absent_optionals_in_wire_form() {
        let mut input = sample();
        input.year = None;
        input.teacher = None;
        input.score = None;
        let c = Course::of(input).unwrap();
        let json = serde_json::to_string(&c).unwrap();
        assert!(!json.contains("year"));
        assert!(!json.contains("teacher"));
        assert!(!json.contains("score"));
        assert!(json.contains("\"rawCategoryLabel\""));
    }
}
