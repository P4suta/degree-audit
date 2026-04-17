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
	/** 履修中（評価未確定）の単位合計。現時点の卒業判定には入らない。 */
	readonly inProgressCredits: Credit;
	/** 履修中の科目一覧。UI で「履修中」セクションを出すために使う。 */
	readonly inProgressCourses: readonly Course[];
	/**
	 * 「履修中の科目がすべて合格した場合」の tentative 評価。
	 * 現時点 graduatable=false でも、tentative.graduatable=true なら
	 * 「今期をすべてパスすれば卒業できる」ことが UI で分かる。
	 * 履修中が 0 件の時は undefined（現在と同じなので不要）。
	 */
	readonly tentative?: TentativeAssessment;
}

export interface TentativeAssessment {
	readonly steps: readonly StepOutcome[];
	readonly total: SpecResult;
	readonly thesisEligibility: SpecResult;
	readonly graduatable: boolean;
}

const runCoreAssessment = (
	pool: readonly Course[],
	ruleSet: RuleSet,
): {
	readonly steps: readonly StepOutcome[];
	readonly leftoverCourses: readonly Course[];
	readonly total: SpecResult;
	readonly thesisEligibility: SpecResult;
	readonly graduatable: boolean;
} => {
	const pipeline = runPipeline(pool, ruleSet.requirements);
	const total = ruleSet.totalRequirement.evaluate({ pool });
	const thesis = ruleSet.thesisEligibility.evaluate({ pool });
	const graduatable =
		pipeline.steps.every((s) => s.result.satisfied) && total.satisfied;
	return {
		steps: pipeline.steps,
		leftoverCourses: pipeline.leftoverPool,
		total,
		thesisEligibility: thesis,
		graduatable,
	};
};

export const assessGraduation = (
	record: AcademicRecord,
	ruleSet: RuleSet,
): Assessment => {
	const passed = AcademicRecord.passedCourses(record);
	const current = runCoreAssessment(passed, ruleSet);
	const totalCredits = AcademicRecord.totalCredits(record);
	const inProgressCourses = AcademicRecord.inProgressCourses(record);
	const inProgressCredits = AcademicRecord.inProgressCredits(record);

	let tentative: TentativeAssessment | undefined;
	if (inProgressCourses.length > 0) {
		// 履修中を合格扱いにしたときの再評価。pipeline / totalRequirement /
		// thesisEligibility をもう一度回して「もし全部通ったら」を見せる
		const poolWithInProgress = AcademicRecord.passedOrInProgressCourses(record);
		const t = runCoreAssessment(poolWithInProgress, ruleSet);
		tentative = {
			steps: t.steps,
			total: t.total,
			thesisEligibility: t.thesisEligibility,
			graduatable: t.graduatable,
		};
	}

	return {
		steps: current.steps,
		leftoverCourses: current.leftoverCourses,
		total: current.total,
		thesisEligibility: current.thesisEligibility,
		totalCredits,
		totalCreditsRequired: ruleSet.totalCreditsRequired,
		graduatable: current.graduatable,
		inProgressCredits,
		inProgressCourses,
		...(tentative !== undefined ? { tentative } : {}),
	};
};
