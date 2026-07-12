//! The requirement algebra: a declarative AST ([`requirement`]) plus a single
//! pure interpreter ([`evaluate`]) producing a [`result::SpecResult`].

pub mod evaluate;
pub mod requirement;
pub mod result;

pub use evaluate::evaluate;
pub use requirement::{
    CoursePredicate, ElectiveParams, NamedSubject, PredicateCap, Requirement, Rule,
};
pub use result::{Diagnostic, EvalContext, ExcludedCourse, ExclusionReason, SpecResult, Unit};
