import type { Course } from "../domain/entities/course.ts";
import type { Credit } from "../domain/value-objects/credit.ts";

// Shape of the assessment produced by the Rust/WASM core (the single source of
// truth). These are the wire types the front-end consumes; the engine itself
// lives in Rust (crates/audit-domain).

export interface ExcludedCourse {
	readonly course: Course;
	/** Human-readable exclusion reason, shown as-is in the UI. */
	readonly reason: string;
}

export interface SpecResult {
	readonly satisfied: boolean;
	readonly required: number;
	readonly actual: number;
	readonly contributingCourses: readonly Course[];
	readonly subResults: readonly SpecResult[];
	readonly diagnostics: readonly string[];
	/** Unit shown in `${actual} / ${required} ${unit}`; defaults to credits. */
	readonly unit?: string;
	/** Courses evaluated but dropped by a cap; kept so the UI can show them. */
	readonly excludedCourses?: readonly ExcludedCourse[];
}

export interface StepOutcome {
	readonly id: string;
	readonly label: string;
	readonly result: SpecResult;
	readonly consumedCourseIds: readonly string[];
}

export interface Assessment {
	readonly steps: readonly StepOutcome[];
	readonly leftoverCourses: readonly Course[];
	readonly total: SpecResult;
	readonly thesisEligibility: SpecResult;
	readonly totalCredits: Credit;
	readonly totalCreditsRequired: number;
	readonly graduatable: boolean;
	/** In-progress (grade pending) credits; excluded from the current verdict. */
	readonly inProgressCredits: Credit;
	readonly inProgressCourses: readonly Course[];
	/**
	 * Verdict assuming all in-progress courses pass. Undefined when there are
	 * none. Lets the UI hint "pass everything this term to graduate".
	 */
	readonly tentative?: TentativeAssessment;
}

export interface TentativeAssessment {
	readonly steps: readonly StepOutcome[];
	readonly total: SpecResult;
	readonly thesisEligibility: SpecResult;
	readonly graduatable: boolean;
}
