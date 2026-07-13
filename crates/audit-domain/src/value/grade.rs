//! A letter grade. Ported from `value-objects/grade.ts`.
//!
//! The wire form of each variant is the Japanese grade token (e.g. `秀`), matching
//! the TypeScript `Grade` union so serialized transcripts stay byte-compatible.

use serde::{Deserialize, Serialize};

/// A course's evaluation outcome.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Grade {
    /// 秀 — highest pass (100–90).
    #[serde(rename = "秀")]
    Shu,
    /// 優 — pass (89–80).
    #[serde(rename = "優")]
    Yu,
    /// 良 — pass (79–70).
    #[serde(rename = "良")]
    Ryo,
    /// 可 — pass (69–60).
    #[serde(rename = "可")]
    Ka,
    /// 不可 — fail.
    #[serde(rename = "不可")]
    Fuka,
    /// 認定 — recognized/credited pass (no numeric score).
    #[serde(rename = "認定")]
    Nintei,
    /// 取消 — withdrawn.
    #[serde(rename = "取消")]
    Torikeshi,
    /// 放棄 — abandoned.
    #[serde(rename = "放棄")]
    Hoki,
    /// 履修中 — in progress; not yet counted, but a future counting candidate.
    #[serde(rename = "履修中")]
    Risyuchu,
    /// 不明 — unknown / unparsable.
    #[serde(rename = "不明")]
    Unknown,
}

impl Grade {
    /// The Japanese display token for this grade.
    pub const fn token(self) -> &'static str {
        match self {
            Grade::Shu => "秀",
            Grade::Yu => "優",
            Grade::Ryo => "良",
            Grade::Ka => "可",
            Grade::Fuka => "不可",
            Grade::Nintei => "認定",
            Grade::Torikeshi => "取消",
            Grade::Hoki => "放棄",
            Grade::Risyuchu => "履修中",
            Grade::Unknown => "不明",
        }
    }

    /// Whether this grade counts toward earned credits.
    pub const fn is_passing(self) -> bool {
        matches!(
            self,
            Grade::Shu | Grade::Yu | Grade::Ryo | Grade::Ka | Grade::Nintei
        )
    }

    /// Whether this grade is a pending end-of-term evaluation. Neither passing
    /// nor failing: not counted now, but a candidate should it pass.
    pub const fn is_in_progress(self) -> bool {
        matches!(self, Grade::Risyuchu)
    }

    /// Parse a raw grade token, tolerating common aliases (letter grades, English
    /// words). Unknown or blank input maps to [`Grade::Unknown`] (total function).
    pub fn parse(raw: &str) -> Grade {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            return Grade::Unknown;
        }
        alias(trimmed)
            .or_else(|| alias(&trimmed.to_lowercase()))
            .unwrap_or(Grade::Unknown)
    }
}

/// Alias table mirroring `ALIASES` in `grade.ts`.
fn alias(key: &str) -> Option<Grade> {
    Some(match key {
        "秀" | "s" | "a+" | "ap" => Grade::Shu,
        "優" | "a" => Grade::Yu,
        "良" | "b" => Grade::Ryo,
        "可" | "c" => Grade::Ka,
        "不可" | "f" | "d" => Grade::Fuka,
        "認定" | "p" | "pass" => Grade::Nintei,
        "取消" | "履修取消" | "w" => Grade::Torikeshi,
        "放棄" | "履修放棄" => Grade::Hoki,
        "履修中" | "履" | "履修" | "enrolled" | "in progress" => Grade::Risyuchu,
        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn passing_set_matches_ts() {
        for g in [Grade::Shu, Grade::Yu, Grade::Ryo, Grade::Ka, Grade::Nintei] {
            assert!(g.is_passing(), "{} should pass", g.token());
        }
        for g in [
            Grade::Fuka,
            Grade::Torikeshi,
            Grade::Hoki,
            Grade::Risyuchu,
            Grade::Unknown,
        ] {
            assert!(!g.is_passing(), "{} should not pass", g.token());
        }
    }

    #[test]
    fn only_risyuchu_is_in_progress() {
        assert!(Grade::Risyuchu.is_in_progress());
        assert!(!Grade::Ka.is_in_progress());
    }

    #[test]
    fn parses_kanji_and_letter_aliases() {
        assert_eq!(Grade::parse("秀"), Grade::Shu);
        assert_eq!(Grade::parse("S"), Grade::Shu);
        assert_eq!(Grade::parse("a+"), Grade::Shu);
        assert_eq!(Grade::parse("優"), Grade::Yu);
        assert_eq!(Grade::parse("A"), Grade::Yu);
        assert_eq!(Grade::parse("PASS"), Grade::Nintei);
        assert_eq!(Grade::parse("履"), Grade::Risyuchu);
        assert_eq!(Grade::parse("in progress"), Grade::Risyuchu);
    }

    #[test]
    fn blank_and_unknown_map_to_unknown() {
        assert_eq!(Grade::parse(""), Grade::Unknown);
        assert_eq!(Grade::parse("   "), Grade::Unknown);
        assert_eq!(Grade::parse("zzz"), Grade::Unknown);
    }

    #[test]
    fn serializes_to_japanese_token() {
        assert_eq!(serde_json::to_string(&Grade::Shu).unwrap(), "\"秀\"");
        assert_eq!(
            serde_json::to_string(&Grade::Risyuchu).unwrap(),
            "\"履修中\""
        );
    }
}
