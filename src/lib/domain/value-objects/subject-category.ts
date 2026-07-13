import type { FieldCategory } from "./field-category.ts";

export type SubjectCategoryKind =
	// R2-R5 (AY2020-2023, Reiwa 2-5) categories
	| "common-education/primary"
	| "common-education/liberal/field"
	| "common-education/liberal/foreign-language"
	| "common-education/liberal/career"
	// R6+ (AY2024 onward, Reiwa 6+) introductory course groups
	| "common-education/introductory/core-learning"
	| "common-education/introductory/core-english"
	| "common-education/introductory/foreign-language"
	| "common-education/introductory/math-ai"
	// R6+ liberal course group: 7 fields
	| "common-education/liberal-group/life"
	| "common-education/liberal-group/health-sports"
	| "common-education/liberal-group/career"
	| "common-education/liberal-group/arts"
	| "common-education/liberal-group/humanities-social"
	| "common-education/liberal-group/natural-science"
	| "common-education/liberal-group/complex"
	// Seminar (both regimes)
	| "seminar/1-2"
	| "seminar/3-4/spring"
	| "seminar/3-4/fall"
	| "seminar/5-6-thesis"
	// R2-R5 platform structure
	| "platform/basic-a"
	| "platform/basic-b"
	| "platform/foreign-language"
	| "platform/advanced"
	// R6+ platform structure
	| "platform/faculty-common"
	| "platform/humanities"
	| "platform/global-studies"
	| "platform/social-science"
	// Elective (both regimes)
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
	// R6+ introductory course groups
	| { readonly kind: "common-education/introductory/core-learning" }
	| { readonly kind: "common-education/introductory/core-english" }
	| {
			readonly kind: "common-education/introductory/foreign-language";
			readonly language: string;
	  }
	| { readonly kind: "common-education/introductory/math-ai" }
	// R6+ liberal course group: 7 fields
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
	// R6+ platform
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
	liberalCareer: (): SubjectCategory => ({
		kind: "common-education/liberal/career",
	}),
	seminar56Thesis: (): SubjectCategory => ({ kind: "seminar/5-6-thesis" }),
	electiveOwnCourse: (): SubjectCategory => ({ kind: "elective/own-course" }),
	electiveOtherFaculty: (): SubjectCategory => ({
		kind: "elective/other-faculty",
	}),
	unknown: (raw: string): SubjectCategory => ({ kind: "unknown", raw }),
} as const;
