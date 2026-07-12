//! A liberal-arts field bucket. Ported from `value-objects/field-category.ts`.

use serde::{Deserialize, Serialize};

/// One of the four liberal-education fields. Wire form matches the TS union
/// (`humanities` / `social` / `bio-medical` / `natural`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum FieldCategory {
    Humanities,
    Social,
    #[serde(rename = "bio-medical")]
    BioMedical,
    Natural,
}

impl FieldCategory {
    /// All fields, in canonical order (mirrors `FIELD_CATEGORIES`).
    pub const ALL: [FieldCategory; 4] = [
        FieldCategory::Humanities,
        FieldCategory::Social,
        FieldCategory::BioMedical,
        FieldCategory::Natural,
    ];

    /// Japanese display label (mirrors `FIELD_CATEGORY_LABELS`).
    pub const fn label(self) -> &'static str {
        match self {
            FieldCategory::Humanities => "人文",
            FieldCategory::Social => "社会",
            FieldCategory::BioMedical => "生命医療",
            FieldCategory::Natural => "自然",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn labels_match_ts() {
        assert_eq!(FieldCategory::Humanities.label(), "人文");
        assert_eq!(FieldCategory::BioMedical.label(), "生命医療");
    }

    #[test]
    fn all_has_four_in_order() {
        assert_eq!(FieldCategory::ALL.len(), 4);
        assert_eq!(FieldCategory::ALL[0], FieldCategory::Humanities);
    }

    #[test]
    fn wire_form_matches_union() {
        assert_eq!(
            serde_json::to_string(&FieldCategory::BioMedical).unwrap(),
            "\"bio-medical\""
        );
        assert_eq!(
            serde_json::to_string(&FieldCategory::Natural).unwrap(),
            "\"natural\""
        );
    }
}
