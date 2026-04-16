import type { Course } from "../entities/course.ts";
import type { Specification, SpecResult } from "../specifications/types.ts";

export type AllocationStrategy =
	/** Consume only up to `result.required` credits worth of contributing courses. */
	| "consume-required"
	/** Consume every contributing course, regardless of credit count. */
	| "consume-all"
	/** Read the pool without removing any courses. */
	| "observe";

export interface PipelineStep {
	readonly spec: Specification;
	readonly allocation: AllocationStrategy;
}

export interface StepOutcome {
	readonly id: string;
	readonly label: string;
	readonly result: SpecResult;
	readonly consumedCourseIds: readonly string[];
}

export interface PipelineOutcome {
	readonly steps: readonly StepOutcome[];
	readonly leftoverPool: readonly Course[];
}

const takeUpTo = (
	courses: readonly Course[],
	limit: number,
): readonly Course[] => {
	const out: Course[] = [];
	let taken = 0;
	for (const course of courses) {
		if (taken >= limit) break;
		out.push(course);
		taken += course.credit as number;
	}
	return out;
};

const selectConsumed = (
	result: SpecResult,
	allocation: AllocationStrategy,
): readonly Course[] => {
	switch (allocation) {
		case "consume-all":
			return result.contributingCourses;
		case "consume-required":
			return takeUpTo(result.contributingCourses, result.required);
		case "observe":
			return [];
	}
};

export const runPipeline = (
	pool: readonly Course[],
	steps: readonly PipelineStep[],
): PipelineOutcome => {
	let remaining: readonly Course[] = pool;
	const stepOutcomes: StepOutcome[] = [];
	for (const step of steps) {
		const result = step.spec.evaluate({ pool: remaining });
		const consumed = selectConsumed(result, step.allocation);
		const consumedIds = new Set(consumed.map((c) => c.id as string));
		remaining = remaining.filter((c) => !consumedIds.has(c.id as string));
		stepOutcomes.push({
			id: step.spec.id,
			label: step.spec.label,
			result,
			consumedCourseIds: [...consumedIds],
		});
	}
	return { steps: stepOutcomes, leftoverPool: remaining };
};
