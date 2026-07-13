//! The R6 rule set: 令和6年度 (2024–) 人文科学コース.

use audit_text::match_key;

use crate::allocation::{Step, Strategy};
use crate::entity::student_profile::StudentProfile;
use crate::spec::requirement::{CoursePredicate, ElectiveParams, NamedSubject, Requirement};
use crate::value::{Language, SubjectCategory, SubjectKind};

use super::{CategoryLookup, CategoryMap, RuleSet, RuleSetMetadata, RuleSetScope};

const MATRICULATION_MIN: u16 = 2024;

fn applicable_to(profile: &StudentProfile) -> bool {
    if profile.matriculation_year < MATRICULATION_MIN {
        return false;
    }
    match_key(&profile.course_id).contains(&match_key("人文"))
}

// --- category map ---

fn language_from(label: &str, name: &str) -> Language {
    Language::from_normalized(name)
        .or_else(|| Language::from_normalized(label))
        .unwrap_or(Language::Unspecified)
}

fn classify(label: &str, name: &str) -> Option<SubjectCategory> {
    let has = |h: &str, n: &str| h.contains(n);

    // Seminar / thesis.
    if has(label, "卒業論文")
        || has(name, "卒業論文")
        || (has(label, "ゼミ") && has(label, "v・vi"))
        || (has(name, "ゼミナール") && has(name, "v・vi"))
    {
        return Some(SubjectCategory::Seminar56Thesis);
    }
    if has(label, "ゼミ") && has(label, "iii") {
        if name.contains("演習iv") || name.ends_with("iv") {
            return Some(SubjectCategory::Seminar34Fall);
        }
        if name.contains("演習ii") || name.ends_with("ii") {
            return Some(SubjectCategory::Seminar34Fall);
        }
        return Some(SubjectCategory::Seminar34Spring);
    }
    if has(label, "ゼミ") {
        return Some(SubjectCategory::Seminar12);
    }

    // Introductory group (R6+).
    if (has(label, "数理") && has(label, "データ"))
        || has(label, "データサイエンス")
        || has(label, "データリテラシ")
    {
        return Some(SubjectCategory::IntroMathAi);
    }
    if (has(label, "基軸英語") || (has(label, "国際コミュ") && has(label, "英語")))
        && !has(label, "教養")
    {
        return Some(SubjectCategory::IntroCoreEnglish);
    }
    if (has(label, "初修外国語")
        || (has(label, "国際コミュ") && (has(label, "外国語") || has(label, "日本語"))))
        && !has(label, "教養")
    {
        return Some(SubjectCategory::IntroForeignLanguage {
            language: language_from(label, name),
        });
    }
    if has(label, "共通教育")
        && (has(label, "学びかた") || has(label, "学び方") || has(label, "導入科目"))
    {
        return Some(SubjectCategory::IntroCoreLearning);
    }

    // Liberal group (R6+ seven areas).
    if has(label, "教養") && (has(label, "医療") || has(label, "健康") || has(label, "スポーツ"))
    {
        return Some(SubjectCategory::LiberalGroupHealthSports);
    }
    if has(label, "教養") && has(label, "キャリア") {
        return Some(SubjectCategory::LiberalGroupCareer);
    }
    if has(label, "教養") && has(label, "芸術") {
        return Some(SubjectCategory::LiberalGroupArts);
    }
    if has(label, "教養")
        && (has(label, "人文・社会")
            || (has(label, "人文") && has(label, "社会"))
            || has(label, "人文社会"))
    {
        return Some(SubjectCategory::LiberalGroupHumanitiesSocial);
    }
    if has(label, "教養") && (has(label, "自然科学") || has(label, "自然分野")) {
        return Some(SubjectCategory::LiberalGroupNaturalScience);
    }
    if has(label, "教養") && (has(label, "複合") || has(label, "総合")) {
        return Some(SubjectCategory::LiberalGroupComplex);
    }
    if has(label, "教養") && has(label, "生活") {
        return Some(SubjectCategory::LiberalGroupLife);
    }

    // Platform (R6+).
    if has(label, "プラット") && has(label, "学部共通") {
        return Some(SubjectCategory::PlatformFacultyCommon);
    }
    if has(label, "プラット") && has(label, "人文科学") {
        return Some(SubjectCategory::PlatformHumanities);
    }
    if has(label, "プラット") && (has(label, "グローバル") || has(label, "国際")) {
        return Some(SubjectCategory::PlatformGlobalStudies);
    }
    if has(label, "プラット") && has(label, "社会科学") {
        return Some(SubjectCategory::PlatformSocialScience);
    }

    // Elective.
    if has(label, "他学部") || has(label, "他学科") || has(label, "単位互換") {
        return Some(SubjectCategory::ElectiveOtherFaculty);
    }
    if has(label, "他コース") {
        return Some(SubjectCategory::ElectiveOtherCourse);
    }
    if has(label, "選択科目")
        || has(label, "自コース")
        || has(label, "専門教育")
        || has(label, "専門科目")
    {
        return Some(SubjectCategory::ElectiveOwnCourse);
    }

    None
}

fn category_map(lookup: &CategoryLookup) -> SubjectCategory {
    let label = match_key(lookup.raw_label);
    if label.is_empty() {
        return SubjectCategory::Unknown {
            raw: lookup.raw_label.to_owned(),
        };
    }
    let name = match_key(lookup.course_name.unwrap_or(""));
    classify(&label, &name).unwrap_or(SubjectCategory::Unknown {
        raw: lookup.raw_label.to_owned(),
    })
}

pub const CATEGORY_MAP: CategoryMap = category_map;

// --- requirements ---

fn core_learning_required() -> Vec<NamedSubject> {
    vec![
        NamedSubject::new("大学基礎論", "大学基礎論"),
        NamedSubject::new("学問基礎論", "学問基礎論"),
        NamedSubject::new("課題探求実践セミナー", "課題探求実践セミナー"),
    ]
}

fn core_english_required() -> Vec<NamedSubject> {
    vec![
        NamedSubject::new("大学英語入門", "大学英語入門"),
        NamedSubject::new("英会話", "英会話 I・II"),
    ]
}

fn math_ai_required() -> Vec<NamedSubject> {
    vec![
        NamedSubject::new("情報とデータリテラシー", "情報とデータリテラシー"),
        NamedSubject::new("データサイエンス入門", "データサイエンス入門"),
    ]
}

fn intro_foreign_languages() -> Vec<Language> {
    // 独/仏/中/韓/朝/西/日本語 (韓/朝 fold to Korean).
    vec![
        Language::German,
        Language::French,
        Language::Chinese,
        Language::Korean,
        Language::Spanish,
        Language::Japanese,
    ]
}

const LIBERAL_GROUP_KINDS: [SubjectKind; 7] = [
    SubjectKind::LiberalGroupLife,
    SubjectKind::LiberalGroupHealthSports,
    SubjectKind::LiberalGroupCareer,
    SubjectKind::LiberalGroupArts,
    SubjectKind::LiberalGroupHumanitiesSocial,
    SubjectKind::LiberalGroupNaturalScience,
    SubjectKind::LiberalGroupComplex,
];

const PLATFORM_KINDS: [SubjectKind; 4] = [
    SubjectKind::PlatformFacultyCommon,
    SubjectKind::PlatformHumanities,
    SubjectKind::PlatformGlobalStudies,
    SubjectKind::PlatformSocialScience,
];

fn intro_foreign_lang(id: &'static str) -> Requirement {
    Requirement::per_language_min(
        id,
        "初修外国語・日本語 1 言語につき 4 単位",
        4,
        1,
        Some(intro_foreign_languages()),
        vec![SubjectKind::IntroForeignLanguage],
    )
}

fn requirements() -> Vec<Step> {
    let intro_core_learning = Requirement::group(
        "intro-core-learning",
        "学びかた科目（6 単位）",
        Requirement::min_credits_in_category(
            "intro-core-learning-6",
            "学びかた科目 合計 6 単位",
            6,
            vec![SubjectKind::IntroCoreLearning],
        ),
        vec![Requirement::require_named_subjects(
            "intro-core-learning-named",
            "学びかた 3 科目（名称必修）",
            core_learning_required(),
        )],
    );
    let intro_core_english = Requirement::group(
        "intro-core-english",
        "基軸英語（4 単位）",
        Requirement::min_credits_in_category(
            "intro-core-english-4",
            "基軸英語 合計 4 単位",
            4,
            vec![SubjectKind::IntroCoreEnglish],
        ),
        vec![Requirement::require_named_subjects(
            "intro-core-english-named",
            "基軸英語（名称必修）",
            core_english_required(),
        )],
    );
    let intro_math_ai = Requirement::group(
        "intro-math-ai",
        "数理・データサイエンス・AI 科目（4 単位）",
        Requirement::min_credits_in_category(
            "intro-math-ai-4",
            "数理 AI 合計 4 単位",
            4,
            vec![SubjectKind::IntroMathAi],
        ),
        vec![Requirement::require_named_subjects(
            "intro-math-ai-named",
            "数理・データサイエンス・AI 2 科目（名称必修）",
            math_ai_required(),
        )],
    );
    let introductory = Requirement::group(
        "introductory-group",
        "導入科目群（学びかた + 基軸英語 + 初修外国語 + 数理 AI）",
        Requirement::min_credits_in_category(
            "introductory-group-10",
            "導入科目群 合計 10 単位以上",
            10,
            vec![
                SubjectKind::IntroCoreLearning,
                SubjectKind::IntroCoreEnglish,
                SubjectKind::IntroForeignLanguage,
                SubjectKind::IntroMathAi,
            ],
        ),
        vec![
            intro_core_learning,
            intro_core_english,
            intro_foreign_lang("intro-foreign-language-4"),
            intro_math_ai,
        ],
    );

    let liberal_group = Requirement::group(
        "liberal-group",
        "教養科目群（合計 26 単位 + 3 分野 8 単位）",
        Requirement::min_credits_in_category(
            "liberal-group-26",
            "教養科目群 合計 26 単位",
            26,
            LIBERAL_GROUP_KINDS.to_vec(),
        ),
        vec![Requirement::min_kinds_covered(
            "liberal-group-fields-3-8",
            "教養 7 分野のうち 3 分野以上（合計 8 単位以上）",
            LIBERAL_GROUP_KINDS.to_vec(),
            1,
            3,
            Some(8),
        )],
    );

    let seminar12 = Requirement::min_credits_in_category(
        "seminar-12",
        "ゼミナール I・II 4 単位",
        4,
        vec![SubjectKind::Seminar12],
    );
    let seminar34 = Requirement::group(
        "seminar-34",
        "ゼミナール III・IV 4 単位（演習 I + 演習 II 各 2 単位）",
        Requirement::min_credits_in_category(
            "seminar-34-total",
            "ゼミナール III・IV 合計 4 単位",
            4,
            vec![SubjectKind::Seminar34Spring, SubjectKind::Seminar34Fall],
        ),
        vec![
            Requirement::min_credits_in_category(
                "seminar-34-spring",
                "演習 I（前期）2 単位",
                2,
                vec![SubjectKind::Seminar34Spring],
            ),
            Requirement::min_credits_in_category(
                "seminar-34-fall",
                "演習 II（後期）2 単位",
                2,
                vec![SubjectKind::Seminar34Fall],
            ),
        ],
    );
    let seminar56 = Requirement::min_credits_in_category(
        "seminar-56",
        "卒業論文・ゼミナール V・VI 8 単位",
        8,
        vec![SubjectKind::Seminar56Thesis],
    );

    let platform = Requirement::group(
        "platform",
        "プラットフォーム（合計 30 単位 + 学部共通 4 単位）",
        Requirement::min_credits_in_category(
            "platform-total-30",
            "PF 科目 合計 30 単位",
            30,
            PLATFORM_KINDS.to_vec(),
        ),
        vec![Requirement::min_credits_in_category(
            "platform-faculty-common-4",
            "PF 学部共通科目 4 単位以上",
            4,
            vec![SubjectKind::PlatformFacultyCommon],
        )],
    );

    let elective = Requirement::elective(
        "elective-42",
        "選択科目 42 単位（他コース + 他学部 + PF 超過は 16 単位枠、他学部 8 単位まで）",
        ElectiveParams {
            required: 42,
            allowed_kinds: vec![
                SubjectKind::ElectiveOwnCourse,
                SubjectKind::ElectiveOtherCourse,
                SubjectKind::ElectiveOtherFaculty,
                SubjectKind::Seminar12,
                SubjectKind::Seminar34Spring,
                SubjectKind::Seminar34Fall,
                SubjectKind::PlatformFacultyCommon,
                SubjectKind::PlatformHumanities,
                SubjectKind::PlatformGlobalStudies,
                SubjectKind::PlatformSocialScience,
            ],
            upstream_handled_kinds: vec![
                SubjectKind::IntroCoreLearning,
                SubjectKind::IntroCoreEnglish,
                SubjectKind::IntroForeignLanguage,
                SubjectKind::IntroMathAi,
                SubjectKind::LiberalGroupLife,
                SubjectKind::LiberalGroupHealthSports,
                SubjectKind::LiberalGroupCareer,
                SubjectKind::LiberalGroupArts,
                SubjectKind::LiberalGroupHumanitiesSocial,
                SubjectKind::LiberalGroupNaturalScience,
                SubjectKind::LiberalGroupComplex,
                SubjectKind::Seminar56Thesis,
            ],
            other_faculty_cap: 8,
            frame_kinds: vec![
                SubjectKind::ElectiveOtherCourse,
                SubjectKind::ElectiveOtherFaculty,
                SubjectKind::PlatformFacultyCommon,
                SubjectKind::PlatformHumanities,
                SubjectKind::PlatformGlobalStudies,
                SubjectKind::PlatformSocialScience,
            ],
            frame_cap: 16,
        },
    );

    vec![
        Step::new(introductory, Strategy::ConsumeAll),
        Step::new(liberal_group, Strategy::ConsumeAll),
        Step::new(seminar12, Strategy::ConsumeRequired),
        Step::new(seminar34, Strategy::ConsumeRequired),
        Step::new(seminar56, Strategy::ConsumeAll),
        Step::new(platform, Strategy::ConsumeRequired),
        Step::new(elective, Strategy::Observe),
    ]
}

fn total_requirement() -> Requirement {
    Requirement::min_credits(
        "total-124",
        "総修得単位 124 単位",
        124,
        CoursePredicate::Always,
    )
}

fn thesis_eligibility() -> Requirement {
    Requirement::all_of(
        "thesis-eligibility",
        "卒業論文履修資格",
        vec![
            Requirement::require_named_subjects(
                "thesis-core-learning-named",
                "学びかた 3 科目（名称必修）",
                core_learning_required(),
            ),
            Requirement::require_named_subjects(
                "thesis-core-english-named",
                "基軸英語（大学英語入門・英会話 I・II）",
                core_english_required(),
            ),
            Requirement::require_named_subjects(
                "thesis-math-ai-named",
                "数理・データサイエンス・AI（情報とデータリテラシー・データサイエンス入門）",
                math_ai_required(),
            ),
            Requirement::min_credits_in_category(
                "thesis-introductory-14",
                "導入科目群（学びかた + 基軸英語 + 数理 AI）合計 14 単位",
                14,
                vec![
                    SubjectKind::IntroCoreLearning,
                    SubjectKind::IntroCoreEnglish,
                    SubjectKind::IntroMathAi,
                ],
            ),
            intro_foreign_lang("thesis-intro-foreign-4"),
            Requirement::min_credits_in_category(
                "thesis-seminar12-4",
                "ゼミナール I・II 4 単位",
                4,
                vec![SubjectKind::Seminar12],
            ),
            Requirement::min_credits_in_category(
                "thesis-seminar34-spring",
                "演習 I（前期）2 単位",
                2,
                vec![SubjectKind::Seminar34Spring],
            ),
            Requirement::min_credits_in_category(
                "thesis-seminar34-fall",
                "演習 II（後期）2 単位",
                2,
                vec![SubjectKind::Seminar34Fall],
            ),
            Requirement::min_credits_in_category(
                "thesis-seminar34-total",
                "ゼミナール III・IV 合計 4 単位",
                4,
                vec![SubjectKind::Seminar34Spring, SubjectKind::Seminar34Fall],
            ),
            Requirement::min_credits(
                "thesis-total-90",
                "総修得単位 90 単位",
                90,
                CoursePredicate::Always,
            ),
        ],
    )
}

/// Build the R6 rule set.
pub fn rule_set() -> RuleSet {
    RuleSet {
        metadata: RuleSetMetadata {
            id: "humanities/2024-",
            display_name: "令和 6 年度（2024 年度）以降入学生・人文科学コース",
            source_revision: "履修案内 2026-04 抜粋（R6 人文科学コース）",
            applicable_to,
            specificity: 110,
            applicable_scopes: vec![RuleSetScope {
                faculty: "人文社会科学部",
                course: "人文科学コース",
            }],
        },
        category_map: CATEGORY_MAP,
        requirements: requirements(),
        total_requirement: total_requirement(),
        thesis_eligibility: thesis_eligibility(),
        total_credits_required: 124,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shape_is_stable() {
        let rs = rule_set();
        assert_eq!(rs.requirements.len(), 7);
        assert_eq!(rs.total_credits_required, 124);
    }
}
