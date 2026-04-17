import type { PipelineStep } from "../../allocation/pipeline.ts";
import { allOf } from "../../specifications/combinators/all-of.ts";
import { cappedContribution } from "../../specifications/combinators/capped-contribution.ts";
import { elective } from "../../specifications/combinators/elective.ts";
import { minCredits } from "../../specifications/combinators/min-credits.ts";
import { minCreditsInCategory } from "../../specifications/combinators/min-credits-in-category.ts";
import { minCreditsWithCaps } from "../../specifications/combinators/min-credits-with-caps.ts";
import { minFieldsCovered } from "../../specifications/combinators/min-fields-covered.ts";
import { perLanguageMin } from "../../specifications/combinators/per-language-min.ts";
import { requireNamedSubjects } from "../../specifications/combinators/require-named-subjects.ts";
import { requirementGroup } from "../../specifications/combinators/requirement-group.ts";
import type { Specification } from "../../specifications/types.ts";
import { isSportsScience } from "./predicates.ts";

const PRIMARY_REQUIRED_SUBJECTS = [
	{ key: "大学基礎論", displayName: "大学基礎論" },
	{ key: "大学英語入門", displayName: "大学英語入門 I・II" },
	{ key: "英会話", displayName: "英会話 I・II" },
	{ key: "情報処理", displayName: "情報処理" },
	{ key: "学問基礎論", displayName: "学問基礎論" },
	{ key: "課題探求実践セミナー", displayName: "課題探求実践セミナー" },
] as const;

const primaryNamed = requireNamedSubjects({
	id: "primary-named",
	label: "初年次 6 科目（名称必修）",
	required: PRIMARY_REQUIRED_SUBJECTS,
});

const primaryTotal = minCreditsInCategory({
	id: "primary-total-12",
	label: "初年次科目 合計 12単位",
	required: 12,
	kinds: ["common-education/primary"],
});

const primary12 = allOf({
	id: "primary-12",
	label: "初年次科目（6 科目 × 2単位 = 12単位）",
	specs: [primaryNamed, primaryTotal],
});

const liberalTotal28 = minCreditsWithCaps({
	id: "liberal-total-28",
	label:
		"教養 合計 28単位（キャリア形成支援は上限 6 単位、スポーツ科学は上限 4 単位まで算入）",
	required: 28,
	kinds: [
		"common-education/liberal/field",
		"common-education/liberal/foreign-language",
		"common-education/liberal/career",
	],
	caps: {
		"common-education/liberal/career": 6,
	},
	predicateCaps: [
		{
			id: "sports-4",
			label: "スポーツ科学",
			predicate: isSportsScience,
			cap: 4,
		},
	],
});

const liberalFields3 = minFieldsCovered({
	id: "liberal-fields-3",
	label: "教養 4分野のうち 3分野以上",
	requiredCreditsPerField: 1,
	requiredFieldCount: 3,
});

const MANDATORY_FOREIGN_LANGUAGES = [
	"ドイツ語",
	"フランス語",
	"中国語",
	"韓国語",
	"朝鮮語",
	"スペイン語",
] as const;

const liberalPerLanguage = perLanguageMin({
	id: "liberal-language-4",
	label: "外国語 1言語につき 4単位以上（独/仏/中/韓/朝/西 のいずれか）",
	requiredPerLanguage: 4,
	requiredLanguageCount: 1,
	allowedLanguages: MANDATORY_FOREIGN_LANGUAGES,
});

const liberalCareerCap = cappedContribution({
	id: "liberal-career-cap-6",
	label: "キャリア形成支援（上限 6単位）",
	cap: 6,
	predicate: (c) => c.category.kind === "common-education/liberal/career",
});

const liberal = requirementGroup({
	id: "liberal",
	label: "教養科目（合計 28単位 + 分野・外国語・キャリア上限）",
	primary: liberalTotal28,
	subSpecs: [liberalFields3, liberalPerLanguage, liberalCareerCap],
});

const seminar12 = minCreditsInCategory({
	id: "seminar-12",
	label: "ゼミナール I・II 4単位",
	required: 4,
	kinds: ["seminar/1-2"],
});

const seminar34Spring = minCreditsInCategory({
	id: "seminar-34-spring",
	label: "演習 I（前期）2単位",
	required: 2,
	kinds: ["seminar/3-4/spring"],
});

const seminar34Fall = minCreditsInCategory({
	id: "seminar-34-fall",
	label: "演習 II（後期）2単位",
	required: 2,
	kinds: ["seminar/3-4/fall"],
});

const seminar34Total = minCreditsInCategory({
	id: "seminar-34-total",
	label: "ゼミナール III・IV 合計 4単位",
	required: 4,
	kinds: ["seminar/3-4/spring", "seminar/3-4/fall"],
});

const seminar34 = allOf({
	id: "seminar-34",
	label: "ゼミナール III・IV 4単位（演習 I + 演習 II 各 2単位）",
	specs: [seminar34Spring, seminar34Fall, seminar34Total],
});

const seminar56 = minCreditsInCategory({
	id: "seminar-56",
	label: "卒業論文・ゼミナール V・VI 8単位",
	required: 8,
	kinds: ["seminar/5-6-thesis"],
});

const platformTotal = minCreditsInCategory({
	id: "platform-total-30",
	label: "PF 科目 合計 30単位",
	required: 30,
	kinds: [
		"platform/basic-a",
		"platform/basic-b",
		"platform/foreign-language",
		"platform/advanced",
	],
});

const platformA = minCreditsInCategory({
	id: "platform-a",
	label: "PF 基礎科目 A 群 2単位",
	required: 2,
	kinds: ["platform/basic-a"],
});

const platformB = minCreditsInCategory({
	id: "platform-b",
	label: "PF 基礎科目 B 群 2単位",
	required: 2,
	kinds: ["platform/basic-b"],
});

const platformBasics = minCreditsInCategory({
	id: "platform-basics-6",
	label: "PF 基礎科目合計 6単位",
	required: 6,
	kinds: ["platform/basic-a", "platform/basic-b"],
});

const platformForeign = minCreditsInCategory({
	id: "platform-foreign-4",
	label: "PF 外国語 4単位",
	required: 4,
	kinds: ["platform/foreign-language"],
});

const platformAdvanced = minCreditsInCategory({
	id: "platform-advanced-8",
	label: "PF 発展 8単位",
	required: 8,
	kinds: ["platform/advanced"],
});

const platform = requirementGroup({
	id: "platform",
	label: "プラットフォーム（合計 30単位 + 内訳）",
	primary: platformTotal,
	subSpecs: [
		platformA,
		platformB,
		platformBasics,
		platformForeign,
		platformAdvanced,
	],
});

const electiveSpec = elective({
	id: "elective-38",
	label:
		"選択科目 38単位（他コース + 他学部 + PF 超過は 16 単位枠、他学部 8 単位まで）",
	required: 38,
	allowedKinds: [
		"elective/own-course",
		"elective/other-course",
		"elective/other-faculty",
		"seminar/1-2",
		"seminar/3-4/spring",
		"seminar/3-4/fall",
		"platform/basic-a",
		"platform/basic-b",
		"platform/foreign-language",
		"platform/advanced",
	],
	// 上流で既に処理された kind は pool に残っていても診断に載せない
	// （例：初年次や教養の超過 / cap-excluded で取りこぼされた科目）
	upstreamHandledKinds: [
		"common-education/primary",
		"common-education/liberal/field",
		"common-education/liberal/foreign-language",
		"common-education/liberal/career",
		"seminar/5-6-thesis",
	],
	otherFacultyCap: 8,
	frameKinds: [
		"elective/other-course",
		"elective/other-faculty",
		"platform/basic-a",
		"platform/basic-b",
		"platform/foreign-language",
		"platform/advanced",
	],
	frameCap: 16,
});

export const requirements: readonly PipelineStep[] = [
	// 初年次・教養・卒論ゼミ V-VI は 選択への読み替え対象ではない → consume-all
	// ゼミ I-IV と PF は超過分が 選択 に読み替えられる → consume-required
	{ spec: primary12, allocation: "consume-all" },
	{ spec: liberal, allocation: "consume-all" },
	{ spec: seminar12, allocation: "consume-required" },
	{ spec: seminar34, allocation: "consume-required" },
	{ spec: seminar56, allocation: "consume-all" },
	{ spec: platform, allocation: "consume-required" },
	{ spec: electiveSpec, allocation: "observe" },
];

/**
 * 総修得単位の要件は pipeline の leftover ではなく、全履修済み科目プールに対して
 * 評価する必要があるため、pipeline から切り出し standalone な Specification として
 * 保持する。
 */
export const totalRequirement: Specification = minCredits({
	id: "total-124",
	label: "総修得単位 124単位",
	required: 124,
	predicate: () => true,
});

export const thesisEligibility: Specification = allOf({
	id: "thesis-eligibility",
	label: "卒業論文履修資格",
	specs: [
		requireNamedSubjects({
			id: "thesis-primary-named",
			label: "初年次 6 科目（名称必修）",
			required: PRIMARY_REQUIRED_SUBJECTS,
		}),
		minCreditsInCategory({
			id: "thesis-primary-total-12",
			label: "初年次科目 合計 12単位",
			required: 12,
			kinds: ["common-education/primary"],
		}),
		perLanguageMin({
			id: "thesis-language-4",
			label: "教養外国語 1言語につき 4単位以上（独/仏/中/韓/朝/西 のいずれか）",
			requiredPerLanguage: 4,
			requiredLanguageCount: 1,
			allowedLanguages: MANDATORY_FOREIGN_LANGUAGES,
		}),
		minCreditsInCategory({
			id: "thesis-seminar12-4",
			label: "ゼミナール I・II 4単位",
			required: 4,
			kinds: ["seminar/1-2"],
		}),
		minCreditsInCategory({
			id: "thesis-seminar34-spring",
			label: "演習 I（前期）2単位",
			required: 2,
			kinds: ["seminar/3-4/spring"],
		}),
		minCreditsInCategory({
			id: "thesis-seminar34-fall",
			label: "演習 II（後期）2単位",
			required: 2,
			kinds: ["seminar/3-4/fall"],
		}),
		minCreditsInCategory({
			id: "thesis-seminar34-total",
			label: "ゼミナール III・IV 合計 4単位",
			required: 4,
			kinds: ["seminar/3-4/spring", "seminar/3-4/fall"],
		}),
		minCredits({
			id: "thesis-total-90",
			label: "総修得単位 90単位",
			required: 90,
			predicate: () => true,
		}),
	],
});
