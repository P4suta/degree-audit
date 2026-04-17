import type { PipelineStep } from "../../allocation/pipeline.ts";
import { allOf } from "../../specifications/combinators/all-of.ts";
import { elective } from "../../specifications/combinators/elective.ts";
import { minCredits } from "../../specifications/combinators/min-credits.ts";
import { minCreditsInCategory } from "../../specifications/combinators/min-credits-in-category.ts";
import { minKindsCovered } from "../../specifications/combinators/min-kinds-covered.ts";
import { perLanguageMin } from "../../specifications/combinators/per-language-min.ts";
import { requireNamedSubjects } from "../../specifications/combinators/require-named-subjects.ts";
import { requirementGroup } from "../../specifications/combinators/requirement-group.ts";
import type { Specification } from "../../specifications/types.ts";
import type { SubjectCategoryKind } from "../../value-objects/subject-category.ts";

// === 導入科目群 ===

const CORE_LEARNING_REQUIRED = [
	{ key: "大学基礎論", displayName: "大学基礎論" },
	{ key: "学問基礎論", displayName: "学問基礎論" },
	{ key: "課題探求実践セミナー", displayName: "課題探求実践セミナー" },
] as const;

const CORE_ENGLISH_REQUIRED = [
	{ key: "大学英語入門", displayName: "大学英語入門" },
	{ key: "英会話", displayName: "英会話 I・II" },
] as const;

const MATH_AI_REQUIRED = [
	{ key: "情報とデータリテラシー", displayName: "情報とデータリテラシー" },
	{ key: "データサイエンス入門", displayName: "データサイエンス入門" },
] as const;

const INTRO_FOREIGN_LANGUAGES = [
	"ドイツ語",
	"フランス語",
	"中国語",
	"韓国語",
	"朝鮮語",
	"スペイン語",
	"日本語",
] as const;

const INTRO_ALL_KINDS: readonly SubjectCategoryKind[] = [
	"common-education/introductory/core-learning",
	"common-education/introductory/core-english",
	"common-education/introductory/foreign-language",
	"common-education/introductory/math-ai",
];

const introCoreLearningNamed = requireNamedSubjects({
	id: "intro-core-learning-named",
	label: "学びかた 3 科目（名称必修）",
	required: CORE_LEARNING_REQUIRED,
});

const introCoreLearningTotal = minCreditsInCategory({
	id: "intro-core-learning-6",
	label: "学びかた科目 合計 6 単位",
	required: 6,
	kinds: ["common-education/introductory/core-learning"],
});

const introCoreLearning = requirementGroup({
	id: "intro-core-learning",
	label: "学びかた科目（6 単位）",
	primary: introCoreLearningTotal,
	subSpecs: [introCoreLearningNamed],
});

const introCoreEnglishNamed = requireNamedSubjects({
	id: "intro-core-english-named",
	label: "基軸英語（名称必修）",
	required: CORE_ENGLISH_REQUIRED,
});

const introCoreEnglishTotal = minCreditsInCategory({
	id: "intro-core-english-4",
	label: "基軸英語 合計 4 単位",
	required: 4,
	kinds: ["common-education/introductory/core-english"],
});

const introCoreEnglish = requirementGroup({
	id: "intro-core-english",
	label: "基軸英語（4 単位）",
	primary: introCoreEnglishTotal,
	subSpecs: [introCoreEnglishNamed],
});

/** 1 言語 4 単位（独/仏/中/韓/朝/西/日本語 から選択） */
const introForeignLang = perLanguageMin({
	id: "intro-foreign-language-4",
	label: "初修外国語・日本語 1 言語につき 4 単位",
	requiredPerLanguage: 4,
	requiredLanguageCount: 1,
	allowedLanguages: INTRO_FOREIGN_LANGUAGES,
	kinds: ["common-education/introductory/foreign-language"],
});

const introMathAiNamed = requireNamedSubjects({
	id: "intro-math-ai-named",
	label: "数理・データサイエンス・AI 2 科目（名称必修）",
	required: MATH_AI_REQUIRED,
});

const introMathAiTotal = minCreditsInCategory({
	id: "intro-math-ai-4",
	label: "数理 AI 合計 4 単位",
	required: 4,
	kinds: ["common-education/introductory/math-ai"],
});

const introMathAi = requirementGroup({
	id: "intro-math-ai",
	label: "数理・データサイエンス・AI 科目（4 単位）",
	primary: introMathAiTotal,
	subSpecs: [introMathAiNamed],
});

// 導入群全体 10 単位以上（学びかた 6 + 基軸英語 4 が必修に入っているので実質の
// 下限は 10。数理 AI / 初修外国語を修めれば自動的に 18 以上になる）
const introductoryTotal = minCreditsInCategory({
	id: "introductory-group-10",
	label: "導入科目群 合計 10 単位以上",
	required: 10,
	kinds: INTRO_ALL_KINDS,
});

const introductoryGroup = requirementGroup({
	id: "introductory-group",
	label: "導入科目群（学びかた + 基軸英語 + 初修外国語 + 数理 AI）",
	primary: introductoryTotal,
	subSpecs: [
		introCoreLearning,
		introCoreEnglish,
		introForeignLang,
		introMathAi,
	],
});

// === 教養科目群（7 分野 × 3+ 分野 × 合計 8+ 単位、総計 26 単位） ===

const LIBERAL_GROUP_KINDS: readonly SubjectCategoryKind[] = [
	"common-education/liberal-group/life",
	"common-education/liberal-group/health-sports",
	"common-education/liberal-group/career",
	"common-education/liberal-group/arts",
	"common-education/liberal-group/humanities-social",
	"common-education/liberal-group/natural-science",
	"common-education/liberal-group/complex",
];

const liberalGroupTotal = minCreditsInCategory({
	id: "liberal-group-26",
	label: "教養科目群 合計 26 単位",
	required: 26,
	kinds: LIBERAL_GROUP_KINDS,
});

const liberalGroupFields = minKindsCovered({
	id: "liberal-group-fields-3-8",
	label: "教養 7 分野のうち 3 分野以上（合計 8 単位以上）",
	kinds: LIBERAL_GROUP_KINDS,
	requiredCreditsPerKind: 1,
	requiredKindCount: 3,
	totalMinCredits: 8,
});

const liberalGroup = requirementGroup({
	id: "liberal-group",
	label: "教養科目群（合計 26 単位 + 3 分野 8 単位）",
	primary: liberalGroupTotal,
	subSpecs: [liberalGroupFields],
});

// === ゼミナール ===

const seminar12 = minCreditsInCategory({
	id: "seminar-12",
	label: "ゼミナール I・II 4 単位",
	required: 4,
	kinds: ["seminar/1-2"],
});

const seminar34Spring = minCreditsInCategory({
	id: "seminar-34-spring",
	label: "演習 I（前期）2 単位",
	required: 2,
	kinds: ["seminar/3-4/spring"],
});

const seminar34Fall = minCreditsInCategory({
	id: "seminar-34-fall",
	label: "演習 II（後期）2 単位",
	required: 2,
	kinds: ["seminar/3-4/fall"],
});

const seminar34Total = minCreditsInCategory({
	id: "seminar-34-total",
	label: "ゼミナール III・IV 合計 4 単位",
	required: 4,
	kinds: ["seminar/3-4/spring", "seminar/3-4/fall"],
});

const seminar34 = requirementGroup({
	id: "seminar-34",
	label: "ゼミナール III・IV 4 単位（演習 I + 演習 II 各 2 単位）",
	primary: seminar34Total,
	subSpecs: [seminar34Spring, seminar34Fall],
});

const seminar56 = minCreditsInCategory({
	id: "seminar-56",
	label: "卒業論文・ゼミナール V・VI 8 単位",
	required: 8,
	kinds: ["seminar/5-6-thesis"],
});

// === プラットフォーム（30 単位 + 学部共通 4 単位以上） ===

const PLATFORM_KINDS: readonly SubjectCategoryKind[] = [
	"platform/faculty-common",
	"platform/humanities",
	"platform/global-studies",
	"platform/social-science",
];

const platformTotal = minCreditsInCategory({
	id: "platform-total-30",
	label: "PF 科目 合計 30 単位",
	required: 30,
	kinds: PLATFORM_KINDS,
});

const platformFacultyCommon = minCreditsInCategory({
	id: "platform-faculty-common-4",
	label: "PF 学部共通科目 4 単位以上",
	required: 4,
	kinds: ["platform/faculty-common"],
});

const platform = requirementGroup({
	id: "platform",
	label: "プラットフォーム（合計 30 単位 + 学部共通 4 単位）",
	primary: platformTotal,
	subSpecs: [platformFacultyCommon],
});

// === 選択科目 42 単位（16 単位枠 + 他学部 8 単位） ===

const electiveSpec = elective({
	id: "elective-42",
	label:
		"選択科目 42 単位（他コース + 他学部 + PF 超過は 16 単位枠、他学部 8 単位まで）",
	required: 42,
	allowedKinds: [
		"elective/own-course",
		"elective/other-course",
		"elective/other-faculty",
		"seminar/1-2",
		"seminar/3-4/spring",
		"seminar/3-4/fall",
		"platform/faculty-common",
		"platform/humanities",
		"platform/global-studies",
		"platform/social-science",
	],
	upstreamHandledKinds: [
		"common-education/introductory/core-learning",
		"common-education/introductory/core-english",
		"common-education/introductory/foreign-language",
		"common-education/introductory/math-ai",
		"common-education/liberal-group/life",
		"common-education/liberal-group/health-sports",
		"common-education/liberal-group/career",
		"common-education/liberal-group/arts",
		"common-education/liberal-group/humanities-social",
		"common-education/liberal-group/natural-science",
		"common-education/liberal-group/complex",
		"seminar/5-6-thesis",
	],
	otherFacultyCap: 8,
	frameKinds: [
		"elective/other-course",
		"elective/other-faculty",
		"platform/faculty-common",
		"platform/humanities",
		"platform/global-studies",
		"platform/social-science",
	],
	frameCap: 16,
});

export const requirements: readonly PipelineStep[] = [
	// 導入・教養・卒論 V-VI は consume-all（選択へ読み替え不可）
	// ゼミ I-IV と PF は consume-required（超過分が選択へ流れる）
	{ spec: introductoryGroup, allocation: "consume-all" },
	{ spec: liberalGroup, allocation: "consume-all" },
	{ spec: seminar12, allocation: "consume-required" },
	{ spec: seminar34, allocation: "consume-required" },
	{ spec: seminar56, allocation: "consume-all" },
	{ spec: platform, allocation: "consume-required" },
	{ spec: electiveSpec, allocation: "observe" },
];

export const totalRequirement: Specification = minCredits({
	id: "total-124",
	label: "総修得単位 124 単位",
	required: 124,
	predicate: () => true,
});

export const thesisEligibility: Specification = allOf({
	id: "thesis-eligibility",
	label: "卒業論文履修資格",
	specs: [
		// 学びかた 3 科目
		requireNamedSubjects({
			id: "thesis-core-learning-named",
			label: "学びかた 3 科目（名称必修）",
			required: CORE_LEARNING_REQUIRED,
		}),
		// 基軸英語 2 科目
		requireNamedSubjects({
			id: "thesis-core-english-named",
			label: "基軸英語（大学英語入門・英会話 I・II）",
			required: CORE_ENGLISH_REQUIRED,
		}),
		// 数理 AI 2 科目
		requireNamedSubjects({
			id: "thesis-math-ai-named",
			label:
				"数理・データサイエンス・AI（情報とデータリテラシー・データサイエンス入門）",
			required: MATH_AI_REQUIRED,
		}),
		// 導入の合計 14 単位（学びかた 6 + 基軸英語 4 + 数理 AI 4）
		minCreditsInCategory({
			id: "thesis-introductory-14",
			label: "導入科目群（学びかた + 基軸英語 + 数理 AI）合計 14 単位",
			required: 14,
			kinds: [
				"common-education/introductory/core-learning",
				"common-education/introductory/core-english",
				"common-education/introductory/math-ai",
			],
		}),
		// 初修外国語・日本語 1 言語 4 単位
		perLanguageMin({
			id: "thesis-intro-foreign-4",
			label: "初修外国語・日本語 1 言語につき 4 単位",
			requiredPerLanguage: 4,
			requiredLanguageCount: 1,
			allowedLanguages: INTRO_FOREIGN_LANGUAGES,
			kinds: ["common-education/introductory/foreign-language"],
		}),
		// ゼミ I・II 4
		minCreditsInCategory({
			id: "thesis-seminar12-4",
			label: "ゼミナール I・II 4 単位",
			required: 4,
			kinds: ["seminar/1-2"],
		}),
		// ゼミ III 2
		minCreditsInCategory({
			id: "thesis-seminar34-spring",
			label: "演習 I（前期）2 単位",
			required: 2,
			kinds: ["seminar/3-4/spring"],
		}),
		// ゼミ IV 2
		minCreditsInCategory({
			id: "thesis-seminar34-fall",
			label: "演習 II（後期）2 単位",
			required: 2,
			kinds: ["seminar/3-4/fall"],
		}),
		// ゼミ III・IV 合計 4
		minCreditsInCategory({
			id: "thesis-seminar34-total",
			label: "ゼミナール III・IV 合計 4 単位",
			required: 4,
			kinds: ["seminar/3-4/spring", "seminar/3-4/fall"],
		}),
		// 総修得 90
		minCredits({
			id: "thesis-total-90",
			label: "総修得単位 90 単位",
			required: 90,
			predicate: () => true,
		}),
	],
});
