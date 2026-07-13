import type { Course } from "../domain/entities/course.ts";
import { isInProgress } from "../domain/value-objects/grade.ts";
import {
	kindDisplayName,
	type SubjectCategoryKind,
} from "../domain/value-objects/subject-category.ts";
import type { Assessment } from "./assessment-types.ts";

/**
 * Natural-home requirement-id candidates per kind. Scanned in order; the first
 * id present in `assessment.steps` is the natural home. The active ruleset
 * (R2-R5 vs R6+) decides which ids actually run, so at most one candidate
 * resolves for a given assessment.
 */
type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

const NATURAL_HOME_CANDIDATES: ReadonlyMap<
	SubjectCategoryKind,
	NonEmptyReadonlyArray<string>
> = new Map([
	// R2-R5
	["common-education/primary", ["primary-12"]],
	["common-education/liberal/field", ["liberal"]],
	["common-education/liberal/foreign-language", ["liberal"]],
	["common-education/liberal/career", ["liberal"]],
	// R6+ introductory
	["common-education/introductory/core-learning", ["introductory-group"]],
	["common-education/introductory/core-english", ["introductory-group"]],
	["common-education/introductory/foreign-language", ["introductory-group"]],
	["common-education/introductory/math-ai", ["introductory-group"]],
	// R6+ liberal
	["common-education/liberal-group/life", ["liberal-group"]],
	["common-education/liberal-group/health-sports", ["liberal-group"]],
	["common-education/liberal-group/career", ["liberal-group"]],
	["common-education/liberal-group/arts", ["liberal-group"]],
	["common-education/liberal-group/humanities-social", ["liberal-group"]],
	["common-education/liberal-group/natural-science", ["liberal-group"]],
	["common-education/liberal-group/complex", ["liberal-group"]],
	// shared by both rulesets
	["seminar/1-2", ["seminar-12"]],
	["seminar/3-4/spring", ["seminar-34"]],
	["seminar/3-4/fall", ["seminar-34"]],
	["seminar/5-6-thesis", ["seminar-56"]],
	// platform (step id "platform" in both rulesets)
	["platform/basic-a", ["platform"]],
	["platform/basic-b", ["platform"]],
	["platform/foreign-language", ["platform"]],
	["platform/advanced", ["platform"]],
	["platform/faculty-common", ["platform"]],
	["platform/humanities", ["platform"]],
	["platform/global-studies", ["platform"]],
	["platform/social-science", ["platform"]],
	// elective splits into 38 / 42 by ruleset
	["elective/own-course", ["elective-38", "elective-42"]],
	["elective/other-course", ["elective-38", "elective-42"]],
	["elective/other-faculty", ["elective-38", "elective-42"]],
] as const);

const resolveNaturalHome = (
	kind: SubjectCategoryKind,
	stepIds: ReadonlySet<string>,
): string | null => {
	const candidates = NATURAL_HOME_CANDIDATES.get(kind);
	if (candidates === undefined) return null;
	for (const id of candidates) {
		if (stepIds.has(id)) return id;
	}
	// No candidate present in steps: fall back to the first. A ruleset always
	// contains one, so this is rarely reached; the tuple type keeps it non-empty.
	return candidates[0];
};

export type CourseStatus =
	| {
			/** Counted toward this requirement's required credits. */
			readonly kind: "counted";
			/** The requirement id that consumed it. */
			readonly requirementId: string;
			/** True only when counted somewhere other than the natural home (reallocated). */
			readonly reallocated: boolean;
			/** Natural-home requirement id (resolved from kind). */
			readonly naturalHome: string | null;
	  }
	| {
			/** Passed beyond a requirement's need and not reallocated downstream
			 *  (e.g. liberal/field credits over the liberal cap). */
			readonly kind: "unused-overflow";
			readonly naturalHome: string | null;
	  }
	| {
			/** Excluded by a cap (other-faculty 8 / 16-credit frame). */
			readonly kind: "excluded";
			readonly reason: string;
			readonly naturalHome: string | null;
	  }
	| {
			/** In progress (grade pending). Excluded from current credits, but a
			 *  candidate in the tentative "where would it count if passed" view. */
			readonly kind: "in-progress";
			readonly naturalHome: string | null;
	  }
	| {
			/** Failed / ungraded. Excluded from credits. */
			readonly kind: "not-passed";
			readonly naturalHome: string | null;
	  };

export interface CourseAllocation {
	readonly course: Course;
	readonly status: CourseStatus;
}

/**
 * Compute where each course is counted, given an Assessment. Intermediate data
 * for visualizing reallocation and cap overflow in the UI.
 */
export const viewCourseAllocations = (
	assessment: Assessment,
	allCourses: readonly Course[],
	passedCourseIds: ReadonlySet<string>,
): ReadonlyMap<string, CourseAllocation> => {
	const result = new Map<string, CourseAllocation>();

	// consumedCourseIds per step. A consumed course leaves `remaining` and is not
	// passed to later steps, so no course appears in more than one step.
	const consumedByStep = new Map<string, string>(); // courseId -> stepId
	for (const step of assessment.steps) {
		for (const id of step.consumedCourseIds) {
			consumedByStep.set(id, step.id);
		}
	}

	// elective is "observe", so the pipeline never consumes it; a course listed in
	// contributingCourses counts as elective. The step is "elective-38" (R2-R5) or
	// "elective-42" (R6+), so match by the "elective-" prefix.
	const electiveStep = assessment.steps.find((s) =>
		s.id.startsWith("elective-"),
	);
	const electiveStepId = electiveStep?.id ?? null;
	const electiveContributingIds = new Set<string>(
		(electiveStep?.result.contributingCourses ?? []).map((c) => c.id as string),
	);

	// Step ids present in this assessment (used to resolve natural-home candidates).
	const stepIds = new Set<string>(assessment.steps.map((s) => s.id));

	// Courses excluded by a cap.
	const excludedByCourseId = new Map<string, string>(); // courseId -> reason
	for (const step of assessment.steps) {
		for (const ex of step.result.excludedCourses ?? []) {
			excludedByCourseId.set(ex.course.id as string, ex.reason);
		}
	}

	for (const course of allCourses) {
		const id = course.id as string;
		const kind = course.category.kind;
		const naturalHome = resolveNaturalHome(kind, stepIds);

		if (!passedCourseIds.has(id)) {
			if (isInProgress(course.grade)) {
				result.set(id, {
					course,
					status: { kind: "in-progress", naturalHome },
				});
			} else {
				result.set(id, {
					course,
					status: { kind: "not-passed", naturalHome },
				});
			}
			continue;
		}

		const consumedBy = consumedByStep.get(id);
		if (consumedBy !== undefined) {
			result.set(id, {
				course,
				status: {
					kind: "counted",
					requirementId: consumedBy,
					reallocated: naturalHome !== null && naturalHome !== consumedBy,
					naturalHome,
				},
			});
			continue;
		}

		if (electiveStepId !== null && electiveContributingIds.has(id)) {
			result.set(id, {
				course,
				status: {
					kind: "counted",
					requirementId: electiveStepId,
					reallocated: naturalHome !== null && naturalHome !== electiveStepId,
					naturalHome,
				},
			});
			continue;
		}

		const excludedReason = excludedByCourseId.get(id);
		if (excludedReason !== undefined) {
			result.set(id, {
				course,
				status: { kind: "excluded", reason: excludedReason, naturalHome },
			});
			continue;
		}

		// Not picked up by any requirement = surplus (e.g. liberal overflow).
		result.set(id, {
			course,
			status: { kind: "unused-overflow", naturalHome },
		});
	}

	return result;
};

/** Display label for a requirement id. */
export const requirementDisplayName = (requirementId: string): string => {
	switch (requirementId) {
		// R2-R5
		case "primary-12":
			return "初年次科目";
		case "liberal":
			return "教養科目";
		// R6+
		case "introductory-group":
			return "導入科目群";
		case "liberal-group":
			return "教養科目群";
		// shared by both rulesets
		case "seminar-12":
			return "ゼミナール I・II";
		case "seminar-34":
			return "ゼミナール III・IV";
		case "seminar-56":
			return "卒業論文・ゼミナール V・VI";
		case "platform":
			return "プラットフォーム科目";
		case "elective-38":
		case "elective-42":
			return "選択科目";
		case "total-124":
			return "総修得単位";
		case "thesis-eligibility":
			return "卒業論文履修資格";
		default:
			return requirementId;
	}
};

/** Display label for a subject-category kind. */
export const courseKindDisplayName = (kind: SubjectCategoryKind): string =>
	kindDisplayName(kind);
