//! Maps raw string rows to typed domain courses. Ported from
//! `infrastructure/mappers/raw-to-course.ts`.
//!
//! This is the single parse boundary: fallible text → validated value objects.
//! Rows that cannot be mapped are collected as [`MappingFailure`]s rather than
//! aborting the whole import (mirrors the "skip with reason" behavior).

use std::collections::HashSet;

use audit_domain::entity::course::{Course, CourseInput};
use audit_domain::error::{DomainError, ErrorCode};
use audit_domain::ruleset::{CategoryLookup, CategoryMap};
use audit_domain::value::{CourseId, Credit, Grade};

use crate::port::RawCourse;

/// A row that could not be mapped, with the reason.
#[derive(Debug, Clone)]
pub struct MappingFailure {
    pub raw: RawCourse,
    pub error: DomainError,
}

/// The result of mapping a batch of raw rows.
#[derive(Debug, Clone, Default)]
pub struct MappingOutcome {
    pub courses: Vec<Course>,
    pub skipped: Vec<MappingFailure>,
}

fn parse_credit(text: &str) -> Option<Credit> {
    let cleaned: String = text
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '.')
        .collect();
    if cleaned.is_empty() {
        return None;
    }
    let value: f64 = cleaned.parse().ok()?;
    if !value.is_finite() || value < 0.0 {
        return None;
    }
    Some(Credit::new(value.round() as u32))
}

fn parse_year(text: &str) -> Option<u16> {
    let digits: String = text
        .chars()
        .filter(|c| c.is_ascii_digit())
        .take(4)
        .collect();
    if digits.is_empty() {
        return None;
    }
    let value: u16 = digits.parse().ok()?;
    if (1900..=2100).contains(&value) {
        Some(value)
    } else {
        None
    }
}

fn parse_score(text: &str) -> Option<u16> {
    let cleaned: String = text
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '.')
        .collect();
    if cleaned.is_empty() {
        return None;
    }
    let value: f64 = cleaned.parse().ok()?;
    if !value.is_finite() || value > 100.0 {
        return None;
    }
    Some(value.round() as u16)
}

/// Generates a counter for anonymous ids (rows without a course code).
struct IdAllocator {
    anonymous: u32,
    taken: HashSet<String>,
}

impl IdAllocator {
    fn new() -> Self {
        Self {
            anonymous: 0,
            taken: HashSet::new(),
        }
    }

    /// Derive a stable-but-unique id. With a course code, disambiguate retakes by
    /// year and then a running suffix; without one, a fresh anonymous id.
    fn assign(&mut self, raw: &RawCourse) -> String {
        let Some(code) = raw.course_code.as_deref() else {
            self.anonymous += 1;
            return format!("anonymous-{:06}", self.anonymous);
        };
        let base = match raw.year_text.as_deref() {
            Some(year) if !year.is_empty() => format!("{code}::{year}"),
            _ => code.to_owned(),
        };
        if !self.taken.contains(&base) {
            return base;
        }
        let mut suffix = 2;
        loop {
            let candidate = format!("{base}::{suffix}");
            if !self.taken.contains(&candidate) {
                return candidate;
            }
            suffix += 1;
        }
    }
}

fn map_one(
    raw: &RawCourse,
    category_map: CategoryMap,
    ids: &mut IdAllocator,
) -> Result<Course, DomainError> {
    let Some(credit) = parse_credit(&raw.credit_text) else {
        return Err(DomainError::new(
            ErrorCode::RawCourseMappingFailed,
            format!(
                "Unable to parse credit '{}' for course '{}'",
                raw.credit_text, raw.name
            ),
            format!("科目「{}」の単位数を解釈できません。", raw.name),
        ));
    };
    let id_source = ids.assign(raw);
    ids.taken.insert(id_source.clone());
    let category = category_map(&CategoryLookup {
        raw_label: &raw.raw_category_label,
        course_name: Some(&raw.name),
    });
    Course::of(CourseInput {
        id: CourseId::of(id_source)?,
        name: raw.name.clone(),
        credit,
        grade: Grade::parse(&raw.grade_text),
        category,
        raw_category_label: raw.raw_category_label.clone(),
        year: raw.year_text.as_deref().and_then(parse_year),
        teacher: raw.teacher.clone(),
        score: raw.score_text.as_deref().and_then(parse_score),
    })
}

/// Map raw rows to courses, collecting per-row failures instead of aborting.
pub fn map_raw_courses(raws: &[RawCourse], category_map: CategoryMap) -> MappingOutcome {
    let mut outcome = MappingOutcome::default();
    let mut ids = IdAllocator::new();
    for raw in raws {
        match map_one(raw, category_map, &mut ids) {
            Ok(course) => outcome.courses.push(course),
            Err(error) => outcome.skipped.push(MappingFailure {
                raw: raw.clone(),
                error,
            }),
        }
    }
    outcome
}

#[cfg(test)]
mod tests {
    use super::*;
    use audit_domain::ruleset::default;

    fn raw(name: &str, label: &str, credit: &str, grade: &str) -> RawCourse {
        RawCourse {
            raw_category_label: label.to_owned(),
            name: name.to_owned(),
            credit_text: credit.to_owned(),
            grade_text: grade.to_owned(),
            year_text: Some("2022".to_owned()),
            teacher: None,
            score_text: None,
            course_code: None,
        }
    }

    #[test]
    fn maps_valid_rows_and_skips_unparseable_credit() {
        let raws = vec![
            raw("大学基礎論", "共通教育 / 初年次科目", "2", "優"),
            raw("壊れた行", "共通教育 / 初年次科目", "", "可"),
        ];
        let outcome = map_raw_courses(&raws, default::CATEGORY_MAP);
        assert_eq!(outcome.courses.len(), 1);
        assert_eq!(outcome.skipped.len(), 1);
        assert_eq!(
            outcome.skipped[0].error.code,
            ErrorCode::RawCourseMappingFailed
        );
        assert_eq!(outcome.courses[0].name, "大学基礎論");
        assert_eq!(outcome.courses[0].credit.get(), 2);
    }

    #[test]
    fn anonymous_ids_are_unique() {
        let raws = vec![
            raw("a", "選択科目", "2", "優"),
            raw("b", "選択科目", "2", "優"),
        ];
        let outcome = map_raw_courses(&raws, default::CATEGORY_MAP);
        assert_ne!(outcome.courses[0].id, outcome.courses[1].id);
    }
}
