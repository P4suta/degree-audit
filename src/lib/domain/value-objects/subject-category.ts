import type { FieldCategory } from "./field-category.ts";

export type SubjectCategoryKind =
	| "common-education/primary"
	| "common-education/liberal/field"
	| "common-education/liberal/foreign-language"
	| "common-education/liberal/career"
	| "seminar/1-2"
	| "seminar/3-4"
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
	| { readonly kind: "seminar/3-4" }
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
	seminar34: (): SubjectCategory => ({ kind: "seminar/3-4" }),
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
