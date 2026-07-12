//! What bucket a course falls into. Ported from `value-objects/subject-category.ts`.
//!
//! [`SubjectCategory`] is the data-bearing category (some variants carry a field
//! or language). [`SubjectKind`] is its field-less discriminant — a `Copy` value
//! used for set membership, caps, and display, keeping "which bucket" separate
//! from "the bucket's payload". Only foreign-language variants carry a language
//! and only the liberal-field variant carries a field, so an illegal pairing
//! (say, a language on a seminar) is unrepresentable.

use serde::{Deserialize, Serialize};

use super::field_category::FieldCategory;
use super::language::Language;

/// The field-less discriminant of a [`SubjectCategory`]. Wire form matches the TS
/// `SubjectCategoryKind` union.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SubjectKind {
    #[serde(rename = "common-education/primary")]
    CommonPrimary,
    #[serde(rename = "common-education/liberal/field")]
    LiberalField,
    #[serde(rename = "common-education/liberal/foreign-language")]
    LiberalForeignLanguage,
    #[serde(rename = "common-education/liberal/career")]
    LiberalCareer,
    #[serde(rename = "common-education/introductory/core-learning")]
    IntroCoreLearning,
    #[serde(rename = "common-education/introductory/core-english")]
    IntroCoreEnglish,
    #[serde(rename = "common-education/introductory/foreign-language")]
    IntroForeignLanguage,
    #[serde(rename = "common-education/introductory/math-ai")]
    IntroMathAi,
    #[serde(rename = "common-education/liberal-group/life")]
    LiberalGroupLife,
    #[serde(rename = "common-education/liberal-group/health-sports")]
    LiberalGroupHealthSports,
    #[serde(rename = "common-education/liberal-group/career")]
    LiberalGroupCareer,
    #[serde(rename = "common-education/liberal-group/arts")]
    LiberalGroupArts,
    #[serde(rename = "common-education/liberal-group/humanities-social")]
    LiberalGroupHumanitiesSocial,
    #[serde(rename = "common-education/liberal-group/natural-science")]
    LiberalGroupNaturalScience,
    #[serde(rename = "common-education/liberal-group/complex")]
    LiberalGroupComplex,
    #[serde(rename = "seminar/1-2")]
    Seminar12,
    #[serde(rename = "seminar/3-4/spring")]
    Seminar34Spring,
    #[serde(rename = "seminar/3-4/fall")]
    Seminar34Fall,
    #[serde(rename = "seminar/5-6-thesis")]
    Seminar56Thesis,
    #[serde(rename = "platform/basic-a")]
    PlatformBasicA,
    #[serde(rename = "platform/basic-b")]
    PlatformBasicB,
    #[serde(rename = "platform/foreign-language")]
    PlatformForeignLanguage,
    #[serde(rename = "platform/advanced")]
    PlatformAdvanced,
    #[serde(rename = "platform/faculty-common")]
    PlatformFacultyCommon,
    #[serde(rename = "platform/humanities")]
    PlatformHumanities,
    #[serde(rename = "platform/global-studies")]
    PlatformGlobalStudies,
    #[serde(rename = "platform/social-science")]
    PlatformSocialScience,
    #[serde(rename = "elective/own-course")]
    ElectiveOwnCourse,
    #[serde(rename = "elective/other-course")]
    ElectiveOtherCourse,
    #[serde(rename = "elective/other-faculty")]
    ElectiveOtherFaculty,
    #[serde(rename = "unknown")]
    Unknown,
}

impl SubjectKind {
    /// The canonical wire string (matches the TS kind union member).
    pub const fn as_str(self) -> &'static str {
        use SubjectKind::*;
        match self {
            CommonPrimary => "common-education/primary",
            LiberalField => "common-education/liberal/field",
            LiberalForeignLanguage => "common-education/liberal/foreign-language",
            LiberalCareer => "common-education/liberal/career",
            IntroCoreLearning => "common-education/introductory/core-learning",
            IntroCoreEnglish => "common-education/introductory/core-english",
            IntroForeignLanguage => "common-education/introductory/foreign-language",
            IntroMathAi => "common-education/introductory/math-ai",
            LiberalGroupLife => "common-education/liberal-group/life",
            LiberalGroupHealthSports => "common-education/liberal-group/health-sports",
            LiberalGroupCareer => "common-education/liberal-group/career",
            LiberalGroupArts => "common-education/liberal-group/arts",
            LiberalGroupHumanitiesSocial => "common-education/liberal-group/humanities-social",
            LiberalGroupNaturalScience => "common-education/liberal-group/natural-science",
            LiberalGroupComplex => "common-education/liberal-group/complex",
            Seminar12 => "seminar/1-2",
            Seminar34Spring => "seminar/3-4/spring",
            Seminar34Fall => "seminar/3-4/fall",
            Seminar56Thesis => "seminar/5-6-thesis",
            PlatformBasicA => "platform/basic-a",
            PlatformBasicB => "platform/basic-b",
            PlatformForeignLanguage => "platform/foreign-language",
            PlatformAdvanced => "platform/advanced",
            PlatformFacultyCommon => "platform/faculty-common",
            PlatformHumanities => "platform/humanities",
            PlatformGlobalStudies => "platform/global-studies",
            PlatformSocialScience => "platform/social-science",
            ElectiveOwnCourse => "elective/own-course",
            ElectiveOtherCourse => "elective/other-course",
            ElectiveOtherFaculty => "elective/other-faculty",
            Unknown => "unknown",
        }
    }

    /// Japanese display label (mirrors `KIND_DISPLAY_NAMES`).
    pub const fn display_name(self) -> &'static str {
        use SubjectKind::*;
        match self {
            CommonPrimary => "初年次科目",
            LiberalField => "教養 分野",
            LiberalForeignLanguage => "教養 外国語",
            LiberalCareer => "教養 キャリア形成支援",
            IntroCoreLearning => "学びかた科目",
            IntroCoreEnglish => "基軸英語",
            IntroForeignLanguage => "初修外国語・日本語",
            IntroMathAi => "数理・データサイエンス・AI 科目",
            LiberalGroupLife => "教養 生活",
            LiberalGroupHealthSports => "教養 医療・健康・スポーツ",
            LiberalGroupCareer => "教養 キャリア形成",
            LiberalGroupArts => "教養 芸術",
            LiberalGroupHumanitiesSocial => "教養 人文・社会科学系",
            LiberalGroupNaturalScience => "教養 自然科学系",
            LiberalGroupComplex => "教養 複合領域",
            Seminar12 => "ゼミナール I・II",
            Seminar34Spring => "ゼミナール III（演習 I）",
            Seminar34Fall => "ゼミナール IV（演習 II）",
            Seminar56Thesis => "卒業論文・ゼミナール V・VI",
            PlatformBasicA => "PF 基礎 A 群",
            PlatformBasicB => "PF 基礎 B 群",
            PlatformForeignLanguage => "PF 外国語",
            PlatformAdvanced => "PF 発展",
            PlatformFacultyCommon => "PF 学部共通",
            PlatformHumanities => "PF 人文科学分野",
            PlatformGlobalStudies => "PF グローバル研究分野",
            PlatformSocialScience => "PF 社会科学分野",
            ElectiveOwnCourse => "自コース専門",
            ElectiveOtherCourse => "他コース専門",
            ElectiveOtherFaculty => "他学部専門",
            Unknown => "区分未判定",
        }
    }

    /// Whether this is any common-education kind.
    pub fn is_common_education(self) -> bool {
        self.as_str().starts_with("common-education/")
    }

    /// Whether this is any seminar kind.
    pub fn is_seminar(self) -> bool {
        self.as_str().starts_with("seminar/")
    }

    /// Whether this is any platform kind.
    pub fn is_platform(self) -> bool {
        self.as_str().starts_with("platform/")
    }

    /// Whether this is any elective kind.
    pub fn is_elective(self) -> bool {
        self.as_str().starts_with("elective/")
    }
}

/// A course's category, carrying any payload the kind implies. Wire form is the
/// TS shape `{ "kind": "...", <field|language|raw>? }` (internally tagged on `kind`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum SubjectCategory {
    #[serde(rename = "common-education/primary")]
    CommonPrimary,
    #[serde(rename = "common-education/liberal/field")]
    LiberalField { field: FieldCategory },
    #[serde(rename = "common-education/liberal/foreign-language")]
    LiberalForeignLanguage { language: Language },
    #[serde(rename = "common-education/liberal/career")]
    LiberalCareer,
    #[serde(rename = "common-education/introductory/core-learning")]
    IntroCoreLearning,
    #[serde(rename = "common-education/introductory/core-english")]
    IntroCoreEnglish,
    #[serde(rename = "common-education/introductory/foreign-language")]
    IntroForeignLanguage { language: Language },
    #[serde(rename = "common-education/introductory/math-ai")]
    IntroMathAi,
    #[serde(rename = "common-education/liberal-group/life")]
    LiberalGroupLife,
    #[serde(rename = "common-education/liberal-group/health-sports")]
    LiberalGroupHealthSports,
    #[serde(rename = "common-education/liberal-group/career")]
    LiberalGroupCareer,
    #[serde(rename = "common-education/liberal-group/arts")]
    LiberalGroupArts,
    #[serde(rename = "common-education/liberal-group/humanities-social")]
    LiberalGroupHumanitiesSocial,
    #[serde(rename = "common-education/liberal-group/natural-science")]
    LiberalGroupNaturalScience,
    #[serde(rename = "common-education/liberal-group/complex")]
    LiberalGroupComplex,
    #[serde(rename = "seminar/1-2")]
    Seminar12,
    #[serde(rename = "seminar/3-4/spring")]
    Seminar34Spring,
    #[serde(rename = "seminar/3-4/fall")]
    Seminar34Fall,
    #[serde(rename = "seminar/5-6-thesis")]
    Seminar56Thesis,
    #[serde(rename = "platform/basic-a")]
    PlatformBasicA,
    #[serde(rename = "platform/basic-b")]
    PlatformBasicB,
    #[serde(rename = "platform/foreign-language")]
    PlatformForeignLanguage,
    #[serde(rename = "platform/advanced")]
    PlatformAdvanced,
    #[serde(rename = "platform/faculty-common")]
    PlatformFacultyCommon,
    #[serde(rename = "platform/humanities")]
    PlatformHumanities,
    #[serde(rename = "platform/global-studies")]
    PlatformGlobalStudies,
    #[serde(rename = "platform/social-science")]
    PlatformSocialScience,
    #[serde(rename = "elective/own-course")]
    ElectiveOwnCourse,
    #[serde(rename = "elective/other-course")]
    ElectiveOtherCourse,
    #[serde(rename = "elective/other-faculty")]
    ElectiveOtherFaculty,
    #[serde(rename = "unknown")]
    Unknown { raw: String },
}

impl SubjectCategory {
    /// The field-less discriminant of this category.
    pub fn kind(&self) -> SubjectKind {
        use SubjectCategory as C;
        match self {
            C::CommonPrimary => SubjectKind::CommonPrimary,
            C::LiberalField { .. } => SubjectKind::LiberalField,
            C::LiberalForeignLanguage { .. } => SubjectKind::LiberalForeignLanguage,
            C::LiberalCareer => SubjectKind::LiberalCareer,
            C::IntroCoreLearning => SubjectKind::IntroCoreLearning,
            C::IntroCoreEnglish => SubjectKind::IntroCoreEnglish,
            C::IntroForeignLanguage { .. } => SubjectKind::IntroForeignLanguage,
            C::IntroMathAi => SubjectKind::IntroMathAi,
            C::LiberalGroupLife => SubjectKind::LiberalGroupLife,
            C::LiberalGroupHealthSports => SubjectKind::LiberalGroupHealthSports,
            C::LiberalGroupCareer => SubjectKind::LiberalGroupCareer,
            C::LiberalGroupArts => SubjectKind::LiberalGroupArts,
            C::LiberalGroupHumanitiesSocial => SubjectKind::LiberalGroupHumanitiesSocial,
            C::LiberalGroupNaturalScience => SubjectKind::LiberalGroupNaturalScience,
            C::LiberalGroupComplex => SubjectKind::LiberalGroupComplex,
            C::Seminar12 => SubjectKind::Seminar12,
            C::Seminar34Spring => SubjectKind::Seminar34Spring,
            C::Seminar34Fall => SubjectKind::Seminar34Fall,
            C::Seminar56Thesis => SubjectKind::Seminar56Thesis,
            C::PlatformBasicA => SubjectKind::PlatformBasicA,
            C::PlatformBasicB => SubjectKind::PlatformBasicB,
            C::PlatformForeignLanguage => SubjectKind::PlatformForeignLanguage,
            C::PlatformAdvanced => SubjectKind::PlatformAdvanced,
            C::PlatformFacultyCommon => SubjectKind::PlatformFacultyCommon,
            C::PlatformHumanities => SubjectKind::PlatformHumanities,
            C::PlatformGlobalStudies => SubjectKind::PlatformGlobalStudies,
            C::PlatformSocialScience => SubjectKind::PlatformSocialScience,
            C::ElectiveOwnCourse => SubjectKind::ElectiveOwnCourse,
            C::ElectiveOtherCourse => SubjectKind::ElectiveOtherCourse,
            C::ElectiveOtherFaculty => SubjectKind::ElectiveOtherFaculty,
            C::Unknown { .. } => SubjectKind::Unknown,
        }
    }

    /// The liberal-education field, if this is a liberal-field category.
    pub fn field(&self) -> Option<FieldCategory> {
        match self {
            SubjectCategory::LiberalField { field } => Some(*field),
            _ => None,
        }
    }

    /// The study language, if this category carries one.
    pub fn language(&self) -> Option<Language> {
        match self {
            SubjectCategory::LiberalForeignLanguage { language }
            | SubjectCategory::IntroForeignLanguage { language } => Some(*language),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kind_of_data_variants() {
        assert_eq!(
            SubjectCategory::LiberalField {
                field: FieldCategory::Humanities
            }
            .kind(),
            SubjectKind::LiberalField
        );
        assert_eq!(
            SubjectCategory::IntroForeignLanguage {
                language: Language::Chinese
            }
            .kind(),
            SubjectKind::IntroForeignLanguage
        );
        assert_eq!(
            SubjectCategory::Seminar56Thesis.kind(),
            SubjectKind::Seminar56Thesis
        );
    }

    #[test]
    fn payload_accessors() {
        let c = SubjectCategory::LiberalField {
            field: FieldCategory::Social,
        };
        assert_eq!(c.field(), Some(FieldCategory::Social));
        assert_eq!(c.language(), None);
        let lang = SubjectCategory::LiberalForeignLanguage {
            language: Language::German,
        };
        assert_eq!(lang.language(), Some(Language::German));
    }

    #[test]
    fn kind_groups() {
        assert!(SubjectKind::PlatformBasicA.is_platform());
        assert!(SubjectKind::Seminar12.is_seminar());
        assert!(SubjectKind::ElectiveOtherFaculty.is_elective());
        assert!(SubjectKind::CommonPrimary.is_common_education());
    }

    #[test]
    fn wire_shape_matches_ts() {
        let c = SubjectCategory::LiberalField {
            field: FieldCategory::Humanities,
        };
        assert_eq!(
            serde_json::to_string(&c).unwrap(),
            r#"{"kind":"common-education/liberal/field","field":"humanities"}"#
        );
        let u = SubjectCategory::Unknown {
            raw: "[謎]".to_owned(),
        };
        assert_eq!(
            serde_json::to_string(&u).unwrap(),
            r#"{"kind":"unknown","raw":"[謎]"}"#
        );
        assert_eq!(
            serde_json::to_string(&SubjectCategory::CommonPrimary).unwrap(),
            r#"{"kind":"common-education/primary"}"#
        );
    }

    #[test]
    fn kind_wire_string_matches() {
        assert_eq!(
            serde_json::to_string(&SubjectKind::Seminar56Thesis).unwrap(),
            "\"seminar/5-6-thesis\""
        );
    }
}
