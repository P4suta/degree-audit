//! Value objects: small, immutable, self-validating carriers of domain meaning.
//! Each makes an illegal state unrepresentable at the type level where possible.

pub mod academic_year;
pub mod course_id;
pub mod credit;
pub mod field_category;
pub mod grade;
pub mod language;
pub mod subject_category;

pub use academic_year::{AcademicYear, Era, Wareki};
pub use course_id::CourseId;
pub use credit::Credit;
pub use field_category::FieldCategory;
pub use grade::Grade;
pub use language::Language;
pub use subject_category::{SubjectCategory, SubjectKind};
