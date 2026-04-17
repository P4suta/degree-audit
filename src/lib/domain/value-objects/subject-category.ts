import type { FieldCategory } from "./field-category.ts";

export type SubjectCategoryKind =
	// R2-R5（令和2〜5年度）用の区分
	| "common-education/primary"
	| "common-education/liberal/field"
	| "common-education/liberal/foreign-language"
	| "common-education/liberal/career"
	// R6+（令和6年度以降）用の導入科目群分解
	| "common-education/introductory/core-learning"
	| "common-education/introductory/core-english"
	| "common-education/introductory/foreign-language"
	| "common-education/introductory/math-ai"
	// R6+ 教養科目群 7 分野
	| "common-education/liberal-group/life"
	| "common-education/liberal-group/health-sports"
	| "common-education/liberal-group/career"
	| "common-education/liberal-group/arts"
	| "common-education/liberal-group/humanities-social"
	| "common-education/liberal-group/natural-science"
	| "common-education/liberal-group/complex"
	// ゼミナール（両制度共通）
	| "seminar/1-2"
	| "seminar/3-4/spring"
	| "seminar/3-4/fall"
	| "seminar/5-6-thesis"
	// R2-R5 プラットフォーム構成
	| "platform/basic-a"
	| "platform/basic-b"
	| "platform/foreign-language"
	| "platform/advanced"
	// R6+ プラットフォーム構成
	| "platform/faculty-common"
	| "platform/humanities"
	| "platform/global-studies"
	| "platform/social-science"
	// 選択（両制度共通）
	| "elective/own-course"
	| "elective/other-course"
	| "elective/other-faculty"
	| "unknown";

export type SubjectCategory =
	| { readonly kind: "common-education/primary" }
	| {
			readonly kind: "common-education/liberal/field";
			readonly field: FieldCategory;
	  }
	| {
			readonly kind: "common-education/liberal/foreign-language";
			readonly language: string;
	  }
	| { readonly kind: "common-education/liberal/career" }
	// R6+ 導入科目群
	| { readonly kind: "common-education/introductory/core-learning" }
	| { readonly kind: "common-education/introductory/core-english" }
	| {
			readonly kind: "common-education/introductory/foreign-language";
			readonly language: string;
	  }
	| { readonly kind: "common-education/introductory/math-ai" }
	// R6+ 教養科目群 7 分野
	| { readonly kind: "common-education/liberal-group/life" }
	| { readonly kind: "common-education/liberal-group/health-sports" }
	| { readonly kind: "common-education/liberal-group/career" }
	| { readonly kind: "common-education/liberal-group/arts" }
	| { readonly kind: "common-education/liberal-group/humanities-social" }
	| { readonly kind: "common-education/liberal-group/natural-science" }
	| { readonly kind: "common-education/liberal-group/complex" }
	| { readonly kind: "seminar/1-2" }
	| { readonly kind: "seminar/3-4/spring" }
	| { readonly kind: "seminar/3-4/fall" }
	| { readonly kind: "seminar/5-6-thesis" }
	| { readonly kind: "platform/basic-a" }
	| { readonly kind: "platform/basic-b" }
	| { readonly kind: "platform/foreign-language" }
	| { readonly kind: "platform/advanced" }
	// R6+ プラットフォーム
	| { readonly kind: "platform/faculty-common" }
	| { readonly kind: "platform/humanities" }
	| { readonly kind: "platform/global-studies" }
	| { readonly kind: "platform/social-science" }
	| { readonly kind: "elective/own-course" }
	| { readonly kind: "elective/other-course" }
	| { readonly kind: "elective/other-faculty" }
	| { readonly kind: "unknown"; readonly raw: string };

export const SubjectCategory = {
	primary: (): SubjectCategory => ({ kind: "common-education/primary" }),
	liberalField: (field: FieldCategory): SubjectCategory => ({
		kind: "common-education/liberal/field",
		field,
	}),
	liberalForeignLanguage: (language: string): SubjectCategory => ({
		kind: "common-education/liberal/foreign-language",
		language,
	}),
	liberalCareer: (): SubjectCategory => ({
		kind: "common-education/liberal/career",
	}),
	// R6+ 導入科目群
	introCoreLearning: (): SubjectCategory => ({
		kind: "common-education/introductory/core-learning",
	}),
	introCoreEnglish: (): SubjectCategory => ({
		kind: "common-education/introductory/core-english",
	}),
	introForeignLanguage: (language: string): SubjectCategory => ({
		kind: "common-education/introductory/foreign-language",
		language,
	}),
	introMathAi: (): SubjectCategory => ({
		kind: "common-education/introductory/math-ai",
	}),
	// R6+ 教養科目群 7 分野
	liberalGroupLife: (): SubjectCategory => ({
		kind: "common-education/liberal-group/life",
	}),
	liberalGroupHealthSports: (): SubjectCategory => ({
		kind: "common-education/liberal-group/health-sports",
	}),
	liberalGroupCareer: (): SubjectCategory => ({
		kind: "common-education/liberal-group/career",
	}),
	liberalGroupArts: (): SubjectCategory => ({
		kind: "common-education/liberal-group/arts",
	}),
	liberalGroupHumanitiesSocial: (): SubjectCategory => ({
		kind: "common-education/liberal-group/humanities-social",
	}),
	liberalGroupNaturalScience: (): SubjectCategory => ({
		kind: "common-education/liberal-group/natural-science",
	}),
	liberalGroupComplex: (): SubjectCategory => ({
		kind: "common-education/liberal-group/complex",
	}),
	seminar12: (): SubjectCategory => ({ kind: "seminar/1-2" }),
	seminar34Spring: (): SubjectCategory => ({ kind: "seminar/3-4/spring" }),
	seminar34Fall: (): SubjectCategory => ({ kind: "seminar/3-4/fall" }),
	seminar56Thesis: (): SubjectCategory => ({ kind: "seminar/5-6-thesis" }),
	platformBasicA: (): SubjectCategory => ({ kind: "platform/basic-a" }),
	platformBasicB: (): SubjectCategory => ({ kind: "platform/basic-b" }),
	platformForeignLanguage: (): SubjectCategory => ({
		kind: "platform/foreign-language",
	}),
	platformAdvanced: (): SubjectCategory => ({ kind: "platform/advanced" }),
	// R6+ プラットフォーム
	platformFacultyCommon: (): SubjectCategory => ({
		kind: "platform/faculty-common",
	}),
	platformHumanities: (): SubjectCategory => ({ kind: "platform/humanities" }),
	platformGlobalStudies: (): SubjectCategory => ({
		kind: "platform/global-studies",
	}),
	platformSocialScience: (): SubjectCategory => ({
		kind: "platform/social-science",
	}),
	electiveOwnCourse: (): SubjectCategory => ({ kind: "elective/own-course" }),
	electiveOtherCourse: (): SubjectCategory => ({
		kind: "elective/other-course",
	}),
	electiveOtherFaculty: (): SubjectCategory => ({
		kind: "elective/other-faculty",
	}),
	unknown: (raw: string): SubjectCategory => ({ kind: "unknown", raw }),
} as const;

export const isKind = <K extends SubjectCategoryKind>(
	category: SubjectCategory,
	kind: K,
): category is Extract<SubjectCategory, { kind: K }> => category.kind === kind;

export const isCommonEducation = (c: SubjectCategory): boolean =>
	c.kind.startsWith("common-education/");

export const isSeminar = (c: SubjectCategory): boolean =>
	c.kind.startsWith("seminar/");

export const isPlatform = (c: SubjectCategory): boolean =>
	c.kind.startsWith("platform/");

export const isElective = (c: SubjectCategory): boolean =>
	c.kind.startsWith("elective/");

export const isLiberal = (c: SubjectCategory): boolean =>
	c.kind.startsWith("common-education/liberal");

/**
 * 画面表示用のカテゴリ名。診断メッセージやバッジなどで kind の生文字列
 * （例: `common-education/liberal/field`）を出さないようにするための単一情報源。
 * ここを更新するだけで全画面の表示が揃う。
 */
const KIND_DISPLAY_NAMES: Readonly<Record<SubjectCategoryKind, string>> = {
	"common-education/primary": "初年次科目",
	"common-education/liberal/field": "教養 分野",
	"common-education/liberal/foreign-language": "教養 外国語",
	"common-education/liberal/career": "教養 キャリア形成支援",
	"common-education/introductory/core-learning": "学びかた科目",
	"common-education/introductory/core-english": "基軸英語",
	"common-education/introductory/foreign-language": "初修外国語・日本語",
	"common-education/introductory/math-ai": "数理・データサイエンス・AI 科目",
	"common-education/liberal-group/life": "教養 生活",
	"common-education/liberal-group/health-sports": "教養 医療・健康・スポーツ",
	"common-education/liberal-group/career": "教養 キャリア形成",
	"common-education/liberal-group/arts": "教養 芸術",
	"common-education/liberal-group/humanities-social": "教養 人文・社会科学系",
	"common-education/liberal-group/natural-science": "教養 自然科学系",
	"common-education/liberal-group/complex": "教養 複合領域",
	"seminar/1-2": "ゼミナール I・II",
	"seminar/3-4/spring": "ゼミナール III（演習 I）",
	"seminar/3-4/fall": "ゼミナール IV（演習 II）",
	"seminar/5-6-thesis": "卒業論文・ゼミナール V・VI",
	"platform/basic-a": "PF 基礎 A 群",
	"platform/basic-b": "PF 基礎 B 群",
	"platform/foreign-language": "PF 外国語",
	"platform/advanced": "PF 発展",
	"platform/faculty-common": "PF 学部共通",
	"platform/humanities": "PF 人文科学分野",
	"platform/global-studies": "PF グローバル研究分野",
	"platform/social-science": "PF 社会科学分野",
	"elective/own-course": "自コース専門",
	"elective/other-course": "他コース専門",
	"elective/other-faculty": "他学部専門",
	unknown: "区分未判定",
};

export const kindDisplayName = (kind: SubjectCategoryKind): string =>
	KIND_DISPLAY_NAMES[kind];
