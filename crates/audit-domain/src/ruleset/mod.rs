//! Rule sets: the curated graduation requirements for a faculty/year cohort, plus
//! the registry that resolves the applicable one for a profile.
//!
//! A [`RuleSet`] is mostly pure data (a requirement pipeline); its category map
//! and predicates are
//! plain function pointers (never serialized), keeping the type framework-free.

pub mod default;
pub mod r6;

use crate::allocation::Step;
use crate::entity::student_profile::StudentProfile;
use crate::error::{DomainError, DomainResult, ErrorCode};
use crate::spec::requirement::Requirement;
use crate::value::SubjectCategory;

/// Input to a category map: the raw hierarchy label and (optionally) the course name.
#[derive(Debug, Clone, Copy)]
pub struct CategoryLookup<'a> {
    pub raw_label: &'a str,
    pub course_name: Option<&'a str>,
}

/// Maps a raw label/name to a domain category. A pure function per rule set.
pub type CategoryMap = fn(&CategoryLookup) -> SubjectCategory;

/// A (faculty, course) scope hint for UI enumeration.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuleSetScope {
    pub faculty: &'static str,
    pub course: &'static str,
}

/// Metadata identifying and gating a rule set.
#[derive(Debug, Clone)]
pub struct RuleSetMetadata {
    pub id: &'static str,
    pub display_name: &'static str,
    pub source_revision: &'static str,
    /// Whether this rule set applies to a given profile.
    pub applicable_to: fn(&StudentProfile) -> bool,
    /// Higher wins when several rule sets apply; ties are ambiguous errors.
    pub specificity: u32,
    pub applicable_scopes: Vec<RuleSetScope>,
}

/// A complete set of graduation requirements.
#[derive(Debug)]
pub struct RuleSet {
    pub metadata: RuleSetMetadata,
    pub category_map: CategoryMap,
    pub requirements: Vec<Step>,
    pub total_requirement: Requirement,
    pub thesis_eligibility: Requirement,
    pub total_credits_required: u32,
}

/// A collection of rule sets that resolves the applicable one for a profile.
pub struct Registry {
    pub rule_sets: Vec<RuleSet>,
}

impl Registry {
    pub fn new(rule_sets: Vec<RuleSet>) -> Registry {
        Registry { rule_sets }
    }

    /// The standard registry: every curated rule set.
    pub fn standard() -> Registry {
        Registry::new(vec![default::rule_set(), r6::rule_set()])
    }

    /// Resolve the single applicable rule set: highest specificity among those
    /// whose `applicable_to` matches. Zero matches or a specificity tie is an error.
    pub fn resolve(&self, profile: &StudentProfile) -> DomainResult<&RuleSet> {
        let matching: Vec<&RuleSet> = self
            .rule_sets
            .iter()
            .filter(|rs| (rs.metadata.applicable_to)(profile))
            .collect();
        if matching.is_empty() {
            return Err(DomainError::new(
                ErrorCode::RuleSetNotFound,
                "No rule set applies to the given profile",
                "適用できる卒業要件ルールが見つかりませんでした。",
            ));
        }
        let max_specificity = matching
            .iter()
            .map(|rs| rs.metadata.specificity)
            .max()
            .expect("non-empty");
        let winners: Vec<&RuleSet> = matching
            .into_iter()
            .filter(|rs| rs.metadata.specificity == max_specificity)
            .collect();
        if winners.len() > 1 {
            return Err(DomainError::new(
                ErrorCode::RuleSetAmbiguous,
                "Multiple rule sets tied at the same specificity",
                "同等の優先度で複数の卒業要件ルールが該当しました。",
            ));
        }
        Ok(winners[0])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_2022_to_default() {
        let registry = Registry::standard();
        let profile = StudentProfile::new("人文社会科学部", "人文科学コース", 2022).unwrap();
        let rs = registry.resolve(&profile).unwrap();
        assert_eq!(rs.metadata.id, "humanities/2020-2023");
    }

    #[test]
    fn resolves_2024_humanities_to_r6() {
        let registry = Registry::standard();
        let profile = StudentProfile::new("人文社会科学部", "人文科学コース", 2024).unwrap();
        let rs = registry.resolve(&profile).unwrap();
        assert_eq!(rs.metadata.id, "humanities/2024-");
    }

    #[test]
    fn unmatched_year_errors() {
        let registry = Registry::standard();
        let profile = StudentProfile::new("人文社会科学部", "人文科学コース", 2010).unwrap();
        assert_eq!(
            registry.resolve(&profile).unwrap_err().code,
            ErrorCode::RuleSetNotFound
        );
    }
}
