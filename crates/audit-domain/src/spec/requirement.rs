//! The declarative requirement algebra. Ported from `specifications/combinators/*`.
//!
//! The combinator set is closed (rule sets are curated, never user-extended), so
//! it is modeled as a sum type — a `Requirement` tree that is pure data:
//! serializable, comparable, and introspectable. A single interpreter
//! ([`super::evaluate::evaluate`]) gives it meaning; there are no trait objects.

use serde::{Deserialize, Serialize};

use crate::value::{Language, SubjectKind};

/// A predicate over a course. The vocabulary is closed — every predicate the
/// curated rule sets actually use is one of these (verified against both rule sets).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CoursePredicate {
    /// Matches every course.
    Always,
    /// Matches courses whose kind is in the set.
    KindIn { kinds: Vec<SubjectKind> },
    /// Matches courses of exactly one kind.
    Kind { kind: SubjectKind },
    /// Matches スポーツ科学 lecture/practical courses (by name or label).
    SportsScience,
}

/// A named required subject: acquiring at least one matching course satisfies it.
/// Matching is `match_key(course.name).contains(match_key(key))`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NamedSubject {
    pub key: String,
    pub display: String,
}

impl NamedSubject {
    pub fn new(key: impl Into<String>, display: impl Into<String>) -> NamedSubject {
        NamedSubject {
            key: key.into(),
            display: display.into(),
        }
    }
}

/// A cap on a predicate-defined group within [`Rule::MinCreditsWithCaps`].
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PredicateCap {
    pub id: String,
    pub label: String,
    pub over: CoursePredicate,
    pub cap: u32,
}

/// Parameters driving the elective algorithm. All knobs are data; the algorithm
/// itself lives once in the interpreter.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ElectiveParams {
    pub required: u32,
    pub allowed_kinds: Vec<SubjectKind>,
    pub upstream_handled_kinds: Vec<SubjectKind>,
    pub other_faculty_cap: u32,
    pub frame_kinds: Vec<SubjectKind>,
    pub frame_cap: u32,
}

/// The requirement algebra: one variant per combinator. Closed by design.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Rule {
    /// At least `required` credits among courses matching `over`.
    MinCredits {
        required: u32,
        over: CoursePredicate,
    },
    /// Like `MinCredits` over a kind set, but with per-kind and per-predicate caps.
    MinCreditsWithCaps {
        required: u32,
        kinds: Vec<SubjectKind>,
        kind_caps: Vec<(SubjectKind, u32)>,
        predicate_caps: Vec<PredicateCap>,
    },
    /// Always satisfied; contributes up to `cap` credits from courses matching `over`.
    CappedContribution { cap: u32, over: CoursePredicate },
    /// At least `kind_count` of `kinds` covered (≥ `per_kind` credits each),
    /// optionally with a `total_min` across them.
    MinKindsCovered {
        kinds: Vec<SubjectKind>,
        per_kind: u32,
        kind_count: u32,
        total_min: Option<u32>,
    },
    /// At least `field_count` liberal fields covered (≥ `per_field` credits each).
    MinFieldsCovered { per_field: u32, field_count: u32 },
    /// At least `language_count` languages with ≥ `per_language` credits each,
    /// restricted to `kinds` (which must carry a language) and optional `allowed_languages`.
    PerLanguageMin {
        per_language: u32,
        language_count: u32,
        allowed_languages: Option<Vec<Language>>,
        kinds: Vec<SubjectKind>,
    },
    /// All of the named subjects must be acquired.
    RequireNamedSubjects { subjects: Vec<NamedSubject> },
    /// The elective quota with framing caps.
    Elective(ElectiveParams),
    /// A primary requirement plus observe-only sub-requirements.
    Group {
        primary: Box<Requirement>,
        subs: Vec<Requirement>,
    },
    /// Every sub-requirement must be satisfied (counted as satisfied/total).
    All(Vec<Requirement>),
}

/// A named requirement node: identity (`id`/`label`) plus its `rule`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Requirement {
    pub id: String,
    pub label: String,
    pub rule: Rule,
}

impl Requirement {
    fn new(id: impl Into<String>, label: impl Into<String>, rule: Rule) -> Requirement {
        Requirement {
            id: id.into(),
            label: label.into(),
            rule,
        }
    }

    // --- Constructors mirroring the TS combinator factories ---

    pub fn min_credits(
        id: impl Into<String>,
        label: impl Into<String>,
        required: u32,
        over: CoursePredicate,
    ) -> Requirement {
        Requirement::new(id, label, Rule::MinCredits { required, over })
    }

    pub fn min_credits_in_category(
        id: impl Into<String>,
        label: impl Into<String>,
        required: u32,
        kinds: Vec<SubjectKind>,
    ) -> Requirement {
        Requirement::new(
            id,
            label,
            Rule::MinCredits {
                required,
                over: CoursePredicate::KindIn { kinds },
            },
        )
    }

    #[allow(clippy::too_many_arguments)]
    pub fn min_credits_with_caps(
        id: impl Into<String>,
        label: impl Into<String>,
        required: u32,
        kinds: Vec<SubjectKind>,
        kind_caps: Vec<(SubjectKind, u32)>,
        predicate_caps: Vec<PredicateCap>,
    ) -> Requirement {
        Requirement::new(
            id,
            label,
            Rule::MinCreditsWithCaps {
                required,
                kinds,
                kind_caps,
                predicate_caps,
            },
        )
    }

    pub fn capped_contribution(
        id: impl Into<String>,
        label: impl Into<String>,
        cap: u32,
        over: CoursePredicate,
    ) -> Requirement {
        Requirement::new(id, label, Rule::CappedContribution { cap, over })
    }

    pub fn min_kinds_covered(
        id: impl Into<String>,
        label: impl Into<String>,
        kinds: Vec<SubjectKind>,
        per_kind: u32,
        kind_count: u32,
        total_min: Option<u32>,
    ) -> Requirement {
        Requirement::new(
            id,
            label,
            Rule::MinKindsCovered {
                kinds,
                per_kind,
                kind_count,
                total_min,
            },
        )
    }

    pub fn min_fields_covered(
        id: impl Into<String>,
        label: impl Into<String>,
        per_field: u32,
        field_count: u32,
    ) -> Requirement {
        Requirement::new(
            id,
            label,
            Rule::MinFieldsCovered {
                per_field,
                field_count,
            },
        )
    }

    pub fn per_language_min(
        id: impl Into<String>,
        label: impl Into<String>,
        per_language: u32,
        language_count: u32,
        allowed_languages: Option<Vec<Language>>,
        kinds: Vec<SubjectKind>,
    ) -> Requirement {
        Requirement::new(
            id,
            label,
            Rule::PerLanguageMin {
                per_language,
                language_count,
                allowed_languages,
                kinds,
            },
        )
    }

    pub fn require_named_subjects(
        id: impl Into<String>,
        label: impl Into<String>,
        subjects: Vec<NamedSubject>,
    ) -> Requirement {
        Requirement::new(id, label, Rule::RequireNamedSubjects { subjects })
    }

    pub fn elective(
        id: impl Into<String>,
        label: impl Into<String>,
        params: ElectiveParams,
    ) -> Requirement {
        Requirement::new(id, label, Rule::Elective(params))
    }

    pub fn group(
        id: impl Into<String>,
        label: impl Into<String>,
        primary: Requirement,
        subs: Vec<Requirement>,
    ) -> Requirement {
        Requirement::new(
            id,
            label,
            Rule::Group {
                primary: Box::new(primary),
                subs,
            },
        )
    }

    pub fn all_of(
        id: impl Into<String>,
        label: impl Into<String>,
        specs: Vec<Requirement>,
    ) -> Requirement {
        Requirement::new(id, label, Rule::All(specs))
    }
}
