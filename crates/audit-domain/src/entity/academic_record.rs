//! A student's full set of taken courses.
//!
//! Courses are shared as `Arc<Course>` so the assessment can pass pools around and
//! build "contributing" lists cheaply without cloning course data.

use std::sync::Arc;

use crate::entity::course::Course;
use crate::entity::student_profile::StudentProfile;
use crate::value::{Credit, SubjectKind};

/// A shared, reference-counted course. The unit of everything the assessment moves around.
pub type SharedCourse = Arc<Course>;

/// The profile plus every course, in transcript order.
#[derive(Debug, Clone)]
pub struct AcademicRecord {
    pub profile: StudentProfile,
    pub courses: Vec<SharedCourse>,
}

impl AcademicRecord {
    pub fn new(profile: StudentProfile, courses: Vec<SharedCourse>) -> AcademicRecord {
        AcademicRecord { profile, courses }
    }

    /// Passing courses (count toward earned credits).
    pub fn passed_courses(&self) -> Vec<SharedCourse> {
        self.courses
            .iter()
            .filter(|c| c.grade.is_passing())
            .cloned()
            .collect()
    }

    /// In-progress courses (pending evaluation); excluded now, used for the
    /// tentative "if everything passes" assessment.
    pub fn in_progress_courses(&self) -> Vec<SharedCourse> {
        self.courses
            .iter()
            .filter(|c| c.grade.is_in_progress())
            .cloned()
            .collect()
    }

    /// Passed courses plus in-progress ones; the tentative assessment's input.
    pub fn passed_or_in_progress_courses(&self) -> Vec<SharedCourse> {
        self.courses
            .iter()
            .filter(|c| c.grade.is_passing() || c.grade.is_in_progress())
            .cloned()
            .collect()
    }

    /// Sum of passing credits.
    pub fn total_credits(&self) -> Credit {
        self.passed_courses().iter().map(|c| c.credit).sum()
    }

    /// Sum of in-progress credits.
    pub fn in_progress_credits(&self) -> Credit {
        self.in_progress_courses().iter().map(|c| c.credit).sum()
    }

    /// Passing courses of a given kind.
    pub fn courses_by_kind(&self, kind: SubjectKind) -> Vec<SharedCourse> {
        self.passed_courses()
            .into_iter()
            .filter(|c| c.kind() == kind)
            .collect()
    }

    /// Sum of passing credits of a given kind.
    pub fn credits_by_kind(&self, kind: SubjectKind) -> Credit {
        self.courses_by_kind(kind).iter().map(|c| c.credit).sum()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entity::course::CourseInput;
    use crate::value::{CourseId, Grade, SubjectCategory};

    fn course(id: &str, credit: u32, grade: Grade, category: SubjectCategory) -> SharedCourse {
        Arc::new(
            Course::of(CourseInput {
                id: CourseId::of(id).unwrap(),
                name: format!("course {id}"),
                credit: Credit::new(credit),
                grade,
                category,
                raw_category_label: "x".to_owned(),
                year: None,
                teacher: None,
                score: None,
            })
            .unwrap(),
        )
    }

    fn record() -> AcademicRecord {
        AcademicRecord::new(
            StudentProfile::new("f", "人文科学コース", 2022).unwrap(),
            vec![
                course("a", 2, Grade::Yu, SubjectCategory::CommonPrimary),
                course("b", 8, Grade::Risyuchu, SubjectCategory::Seminar56Thesis),
                course("c", 2, Grade::Fuka, SubjectCategory::ElectiveOwnCourse),
                course("d", 4, Grade::Nintei, SubjectCategory::CommonPrimary),
            ],
        )
    }

    #[test]
    fn partitions_by_grade() {
        let r = record();
        assert_eq!(r.passed_courses().len(), 2); // a, d
        assert_eq!(r.in_progress_courses().len(), 1); // b
        assert_eq!(r.passed_or_in_progress_courses().len(), 3);
    }

    #[test]
    fn sums_credits() {
        let r = record();
        assert_eq!(r.total_credits().get(), 6); // 2 + 4
        assert_eq!(r.in_progress_credits().get(), 8);
        assert_eq!(r.credits_by_kind(SubjectKind::CommonPrimary).get(), 6);
    }
}
