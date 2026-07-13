//! audit-app — orchestrating an audit from raw input.
//!
//! Owns the driven port ([`TranscriptSource`]) and its boundary DTO ([`RawCourse`]),
//! the raw→`Course` mapper, and the import use case. Rule-set resolution and
//! assessment live in `audit_domain`; this crate wires raw bytes to them.

pub mod import;
pub mod mapper;
pub mod port;

pub use import::{ImportOutcome, import_raw_courses, import_transcript};
pub use mapper::{MappingFailure, MappingOutcome, map_raw_courses};
pub use port::{RawCourse, TranscriptSource};
