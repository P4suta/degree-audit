import type { FieldCategory } from "./field-category.ts";

export type SubjectCategoryKind =
	| "common-education/primary"
	| "common-education/liberal/field"
	| "common-education/liberal/foreign-language"
	| "common-education/liberal/career"
	| "seminar/1-2"
	| "seminar/3-4/spring"
	| "seminar/3-4/fall"
	| "seminar/5-6-thesis"
	| "platform/basic-a"
	| "platform/basic-b"
	| "platform/foreign-language"
	| "platform/advanced"
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
	| { readonly kind: "seminar/1-2" }
	| { readonly kind: "seminar/3-4/spring" }
	| { readonly kind: "seminar/3-4/fall" }
	| { readonly kind: "seminar/5-6-thesis" }
	| { readonly kind: "platform/basic-a" }
	| { readonly kind: "platform/basic-b" }
	| { readonly kind: "platform/foreign-language" }
	| { readonly kind: "platform/advanced" }
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
	"seminar/1-2": "ゼミナール I・II",
	"seminar/3-4/spring": "ゼミナール III（演習 I）",
	"seminar/3-4/fall": "ゼミナール IV（演習 II）",
	"seminar/5-6-thesis": "卒業論文・ゼミナール V・VI",
	"platform/basic-a": "PF 基礎 A 群",
	"platform/basic-b": "PF 基礎 B 群",
	"platform/foreign-language": "PF 外国語",
	"platform/advanced": "PF 発展",
	"elective/own-course": "自コース専門",
	"elective/other-course": "他コース専門",
	"elective/other-faculty": "他学部専門",
	unknown: "区分未判定",
};

export const kindDisplayName = (kind: SubjectCategoryKind): string =>
	KIND_DISPLAY_NAMES[kind];
