//! The outcome of evaluating a requirement.
//!
//! Diagnostics are kept as *structured facts* (an enum), not pre-rendered
//! Japanese strings — human wording is a presentation concern. This keeps the
//! domain pure and lets any front-end localize.

use serde::{Deserialize, Serialize};

use crate::entity::academic_record::SharedCourse;
use crate::value::{FieldCategory, Language, SubjectKind};

/// The counting unit a [`SpecResult`]'s `required`/`actual` are expressed in.
///
/// Serialized as a stable key (the default `credit` is omitted from the wire);
/// the front-end localizes it. `token()` holds the Japanese form for the CLI.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Unit {
    /// 単位 — credits (the default; omitted from the wire form).
    Credit,
    /// 分野 — fields/areas covered.
    Field,
    /// 言語 — languages satisfied.
    Language,
    /// 科目 — named subjects acquired.
    Subject,
    /// 要件 — sub-requirements satisfied.
    Requirement,
}

impl Unit {
    /// The default unit is omitted from the wire form (matching the optional TS field).
    pub fn is_credit(&self) -> bool {
        matches!(self, Unit::Credit)
    }

    /// Japanese token for display.
    pub const fn token(self) -> &'static str {
        match self {
            Unit::Credit => "単位",
            Unit::Field => "分野",
            Unit::Language => "言語",
            Unit::Subject => "科目",
            Unit::Requirement => "要件",
        }
    }
}

/// Why a course was evaluated but excluded from the effective total.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ExclusionReason {
    /// Over the standalone other-faculty cap.
    OtherFacultyCapExceeded { cap: u32 },
    /// Over the shared frame cap (other-course + other-faculty + platform overflow).
    FrameCapExceeded { cap: u32 },
}

/// A course excluded from the effective total, with a machine-readable reason.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ExcludedCourse {
    pub course: SharedCourse,
    pub reason: ExclusionReason,
}

/// A structured diagnostic fact. Front-ends render these into prose.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Diagnostic {
    /// Overall progress toward the requirement.
    Progress {
        actual: u32,
        required: u32,
        unit: Unit,
    },
    /// Total credits (for kind-coverage requirements that also check a total).
    Total { actual: u32, required: u32 },
    /// Credits accumulated in a specific kind.
    KindCredits { kind: SubjectKind, credits: u32 },
    /// Credits accumulated in a liberal field.
    FieldCredits { field: FieldCategory, credits: u32 },
    /// Credits in a language; `allowed` is false when outside the required set.
    LanguageCredits {
        language: Language,
        credits: u32,
        allowed: bool,
    },
    /// Whether a named required subject was acquired, and its credits.
    SubjectStatus {
        display: String,
        acquired: bool,
        credits: u32,
    },
    /// A cap's usage: `raw` taken vs `counted` toward the requirement, capped at `cap`.
    Cap {
        label: String,
        cap: u32,
        counted: u32,
        raw: u32,
    },
    /// A frame/quota's usage.
    Frame { label: String, used: u32, cap: u32 },
}

/// The result of evaluating one requirement against a course pool.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecResult {
    pub satisfied: bool,
    pub required: u32,
    pub actual: u32,
    #[serde(skip_serializing_if = "Unit::is_credit")]
    pub unit: Unit,
    #[serde(rename = "contributingCourses")]
    pub contributing: Vec<SharedCourse>,
    pub sub_results: Vec<SpecResult>,
    pub diagnostics: Vec<Diagnostic>,
    #[serde(
        rename = "excludedCourses",
        skip_serializing_if = "Vec::is_empty",
        default
    )]
    pub excluded: Vec<ExcludedCourse>,
}

impl SpecResult {
    /// A builder starting from the mandatory fields, unit defaulting to credits.
    pub fn new(satisfied: bool, required: u32, actual: u32) -> SpecResult {
        SpecResult {
            satisfied,
            required,
            actual,
            unit: Unit::Credit,
            contributing: Vec::new(),
            sub_results: Vec::new(),
            diagnostics: Vec::new(),
            excluded: Vec::new(),
        }
    }

    pub fn with_unit(mut self, unit: Unit) -> SpecResult {
        self.unit = unit;
        self
    }

    pub fn with_contributing(mut self, contributing: Vec<SharedCourse>) -> SpecResult {
        self.contributing = contributing;
        self
    }

    pub fn with_diagnostics(mut self, diagnostics: Vec<Diagnostic>) -> SpecResult {
        self.diagnostics = diagnostics;
        self
    }

    pub fn with_sub_results(mut self, sub_results: Vec<SpecResult>) -> SpecResult {
        self.sub_results = sub_results;
        self
    }

    pub fn with_excluded(mut self, excluded: Vec<ExcludedCourse>) -> SpecResult {
        self.excluded = excluded;
        self
    }
}

/// The context a requirement is evaluated against: just the course pool.
#[derive(Debug, Clone, Copy)]
pub struct EvalContext<'a> {
    pub pool: &'a [SharedCourse],
}

impl<'a> EvalContext<'a> {
    pub fn new(pool: &'a [SharedCourse]) -> EvalContext<'a> {
        EvalContext { pool }
    }
}
