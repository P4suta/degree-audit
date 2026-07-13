//! A study language for foreign-language requirements.
//!
//! A closed enum with a canonical Japanese name per language. Detection folds
//! variants that the requirements treat as one (e.g. 韓国語 / 朝鮮語 → Korean),
//! so per-language counting compares canonical values instead of raw strings.

use serde::{Deserialize, Serialize};

/// A language a course may be taught in. `Unspecified` is the fallback used when
/// a foreign-language course's language cannot be identified. The wire form is
/// the canonical Japanese name.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Language {
    #[serde(rename = "英語")]
    English,
    #[serde(rename = "ドイツ語")]
    German,
    #[serde(rename = "フランス語")]
    French,
    #[serde(rename = "中国語")]
    Chinese,
    #[serde(rename = "韓国語")]
    Korean,
    #[serde(rename = "スペイン語")]
    Spanish,
    #[serde(rename = "ロシア語")]
    Russian,
    #[serde(rename = "日本語")]
    Japanese,
    #[serde(rename = "外国語")]
    Unspecified,
}

impl Language {
    /// Canonical Japanese name.
    pub const fn name(self) -> &'static str {
        match self {
            Language::English => "英語",
            Language::German => "ドイツ語",
            Language::French => "フランス語",
            Language::Chinese => "中国語",
            Language::Korean => "韓国語",
            Language::Spanish => "スペイン語",
            Language::Russian => "ロシア語",
            Language::Japanese => "日本語",
            Language::Unspecified => "外国語",
        }
    }

    /// Identify a language from already-normalized (`match_key`ed) text.
    /// Returns `None` when no language is recognized; callers
    /// decide whether to fall back to [`Language::Unspecified`].
    pub fn from_normalized(text: &str) -> Option<Language> {
        let has = |needle: &str| text.contains(needle);
        // Order matters: English is checked first, matching the TS cascade.
        if has("英語") {
            Some(Language::English)
        } else if has("ドイツ語") || has("独語") {
            Some(Language::German)
        } else if has("フランス語") || has("仏語") {
            Some(Language::French)
        } else if has("中国語") || has("中語") {
            Some(Language::Chinese)
        } else if has("韓国語") || has("朝鮮語") {
            Some(Language::Korean)
        } else if has("スペイン語") || has("西語") {
            Some(Language::Spanish)
        } else if has("ロシア語") || has("露語") {
            Some(Language::Russian)
        } else if has("日本語") {
            Some(Language::Japanese)
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use audit_text::match_key;

    #[test]
    fn detects_canonical_languages() {
        assert_eq!(
            Language::from_normalized(&match_key("中国語中級Ⅰ")),
            Some(Language::Chinese)
        );
        assert_eq!(
            Language::from_normalized(&match_key("専門英語Ⅰ")),
            Some(Language::English)
        );
        assert_eq!(
            Language::from_normalized(&match_key("外国語としての日本語")),
            Some(Language::Japanese)
        );
    }

    #[test]
    fn folds_korean_variants() {
        assert_eq!(Language::from_normalized("韓国語"), Some(Language::Korean));
        assert_eq!(Language::from_normalized("朝鮮語"), Some(Language::Korean));
    }

    #[test]
    fn unrecognized_is_none() {
        assert_eq!(Language::from_normalized("歴史を考える"), None);
    }

    #[test]
    fn wire_form_is_japanese_name() {
        assert_eq!(
            serde_json::to_string(&Language::Chinese).unwrap(),
            "\"中国語\""
        );
        assert_eq!(
            serde_json::to_string(&Language::Unspecified).unwrap(),
            "\"外国語\""
        );
    }
}
