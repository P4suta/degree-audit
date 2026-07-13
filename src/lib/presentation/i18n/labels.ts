/**
 * Presentation-layer i18n labels: maps domain ids (requirement ids, subject
 * category kinds, field categories) to their localized display strings via
 * Paraglide messages. The domain/application layers stay free of display text.
 */

import type { FieldCategory } from "$lib/domain/value-objects/field-category";
import type { SubjectCategoryKind } from "$lib/domain/value-objects/subject-category";
import * as m from "$lib/paraglide/messages";

/** Localized label for a requirement id; unknown ids fall back to the raw id. */
export const requirementLabel = (id: string): string => {
	switch (id) {
		// R2-R5
		case "primary-12":
			return m.req_primary_12();
		case "liberal":
			return m.req_liberal();
		// R6+
		case "introductory-group":
			return m.req_introductory_group();
		case "liberal-group":
			return m.req_liberal_group();
		// shared by both rulesets
		case "seminar-12":
			return m.req_seminar_12();
		case "seminar-34":
			return m.req_seminar_34();
		case "seminar-56":
			return m.req_seminar_56();
		case "platform":
			return m.req_platform();
		case "elective-38":
		case "elective-42":
			return m.req_elective();
		case "total-124":
			return m.req_total_124();
		case "thesis-eligibility":
			return m.req_thesis_eligibility();
		default:
			return id;
	}
};

/** Localized label for a subject-category kind. */
const KIND_LABELS: Readonly<Record<SubjectCategoryKind, () => string>> = {
	"common-education/primary": m.kind_common_education_primary,
	"common-education/liberal/field": m.kind_common_education_liberal_field,
	"common-education/liberal/foreign-language":
		m.kind_common_education_liberal_foreign_language,
	"common-education/liberal/career": m.kind_common_education_liberal_career,
	"common-education/introductory/core-learning":
		m.kind_common_education_introductory_core_learning,
	"common-education/introductory/core-english":
		m.kind_common_education_introductory_core_english,
	"common-education/introductory/foreign-language":
		m.kind_common_education_introductory_foreign_language,
	"common-education/introductory/math-ai":
		m.kind_common_education_introductory_math_ai,
	"common-education/liberal-group/life":
		m.kind_common_education_liberal_group_life,
	"common-education/liberal-group/health-sports":
		m.kind_common_education_liberal_group_health_sports,
	"common-education/liberal-group/career":
		m.kind_common_education_liberal_group_career,
	"common-education/liberal-group/arts":
		m.kind_common_education_liberal_group_arts,
	"common-education/liberal-group/humanities-social":
		m.kind_common_education_liberal_group_humanities_social,
	"common-education/liberal-group/natural-science":
		m.kind_common_education_liberal_group_natural_science,
	"common-education/liberal-group/complex":
		m.kind_common_education_liberal_group_complex,
	"seminar/1-2": m.kind_seminar_1_2,
	"seminar/3-4/spring": m.kind_seminar_3_4_spring,
	"seminar/3-4/fall": m.kind_seminar_3_4_fall,
	"seminar/5-6-thesis": m.kind_seminar_5_6_thesis,
	"platform/basic-a": m.kind_platform_basic_a,
	"platform/basic-b": m.kind_platform_basic_b,
	"platform/foreign-language": m.kind_platform_foreign_language,
	"platform/advanced": m.kind_platform_advanced,
	"platform/faculty-common": m.kind_platform_faculty_common,
	"platform/humanities": m.kind_platform_humanities,
	"platform/global-studies": m.kind_platform_global_studies,
	"platform/social-science": m.kind_platform_social_science,
	"elective/own-course": m.kind_elective_own_course,
	"elective/other-course": m.kind_elective_other_course,
	"elective/other-faculty": m.kind_elective_other_faculty,
	unknown: m.kind_unknown,
};

export const kindLabel = (kind: SubjectCategoryKind): string =>
	KIND_LABELS[kind]();

/** Localized label for a field category. */
const FIELD_LABELS: Readonly<Record<FieldCategory, () => string>> = {
	humanities: m.field_humanities,
	social: m.field_social,
	"bio-medical": m.field_bio_medical,
	natural: m.field_natural,
};

export const fieldLabel = (field: FieldCategory): string =>
	FIELD_LABELS[field]();

/**
 * Localized counting-unit label. The wire carries a key (`field`/`language`/
 * `subject`/`requirement`); the default credit unit is omitted, so `undefined`
 * maps to credits.
 */
export const unitLabel = (unit: string | undefined): string => {
	switch (unit) {
		case "field":
			return m.unit_field();
		case "language":
			return m.unit_language();
		case "subject":
			return m.unit_subject();
		case "requirement":
			return m.unit_requirement();
		default:
			return m.unit_credit();
	}
};
