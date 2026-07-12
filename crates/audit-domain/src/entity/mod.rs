//! Entities: identity-bearing aggregates built from value objects.

pub mod academic_record;
pub mod course;
pub mod student_profile;

pub use academic_record::AcademicRecord;
pub use course::Course;
pub use student_profile::StudentProfile;
