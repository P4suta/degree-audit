//! audit-domain — the pure core: what graduation is.
//!
//! This crate is framework-, I/O-, and target-agnostic. It holds the value
//! objects and entities of the transcript domain, the declarative `Requirement`
//! AST with its single pure interpreter, the allocation fold, the assessment
//! service, and the curated rule sets.
//!
//! Ported from the TypeScript `src/lib/domain/**` tree.

pub mod allocation;
pub mod assess;
pub mod entity;
pub mod error;
pub mod ruleset;
pub mod spec;
pub mod value;

pub use assess::{Assessment, TentativeAssessment, assess};
pub use error::{DomainError, DomainResult, ErrorCode};
pub use ruleset::{Registry, RuleSet};
pub use spec::{Requirement, SpecResult, evaluate};
