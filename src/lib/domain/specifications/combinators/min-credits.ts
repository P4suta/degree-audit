import type { Course } from "../../entities/course.ts";
import {
	type EvalContext,
	type Specification,
	type SpecResult,
	totalCredits,
} from "../types.ts";

export const minCredits = (options: {
	readonly id: string;
	readonly label: string;
	readonly required: number;
	readonly predicate: (course: Course) => boolean;
}): Specification => ({
	id: options.id,
	label: options.label,
	evaluate: (ctx: EvalContext): SpecResult => {
		const matching = ctx.pool.filter(options.predicate);
		const actual = totalCredits(matching);
		const satisfied = actual >= options.required;
		const diagnostics = satisfied
			? [`${actual} / ${options.required} 単位を満たしています`]
			: [
					`${actual} / ${options.required} 単位。あと ${options.required - actual} 単位必要`,
				];
		return {
			satisfied,
			required: options.required,
			actual,
			contributingCourses: matching,
			subResults: [],
			diagnostics,
		};
	},
});
