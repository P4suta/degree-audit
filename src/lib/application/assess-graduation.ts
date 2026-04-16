import {
	runPipeline,
	type StepOutcome,
} from "../domain/allocation/pipeline.ts";
import { AcademicRecord } from "../domain/entities/academic-record.ts";
import type { Course } from "../domain/entities/course.ts";
import type { RuleSet } from "../domain/rulesets/types.ts";
import type { SpecResult } from "../domain/specifications/types.ts";
import type { Credit } from "../domain/value-objects/credit.ts";

export interface Assessment {
	readonly steps: readonly StepOutcome[];
	readonly leftoverCourses: readonly Course[];
	readonly total: SpecResult;
	readonly thesisEligibility: SpecResult;
	readonly totalCredits: Credit;
	readonly totalCreditsRequired: number;
	readonly graduatable: boolean;
}

export const assessGraduation = (
	record: AcademicRecord,
	ruleSet: RuleSet,
): Assessment => {
	const passed = AcademicRecord.passedCourses(record);
	const pipeline = runPipeline(passed, ruleSet.requirements);
	const total = ruleSet.totalRequirement.evaluate({ pool: passed });
	const thesis = ruleSet.thesisEligibility.evaluate({ pool: passed });
	const totalCredits = AcademicRecord.totalCredits(record);
	const graduatable =
		pipeline.steps.every((s) => s.result.satisfied) && total.satisfied;
	return {
		steps: pipeline.steps,
		leftoverCourses: pipeline.leftoverPool,
		total,
		thesisEligibility: thesis,
		totalCredits,
		totalCreditsRequired: ruleSet.totalCreditsRequired,
		graduatable,
	};
};
