import type { Course } from "../../entities/course.ts";
import type { EvalContext, Specification, SpecResult } from "../types.ts";

const uniqueById = (courses: readonly Course[]): readonly Course[] => {
	const seen = new Set<string>();
	const out: Course[] = [];
	for (const c of courses) {
		if (!seen.has(c.id)) {
			seen.add(c.id);
			out.push(c);
		}
	}
	return out;
};

export const allOf = (options: {
	readonly id: string;
	readonly label: string;
	readonly specs: readonly Specification[];
}): Specification => ({
	id: options.id,
	label: options.label,
	evaluate: (ctx: EvalContext): SpecResult => {
		const subResults = options.specs.map((s) => s.evaluate(ctx));
		const required = subResults.reduce((sum, r) => sum + r.required, 0);
		const actual = subResults.reduce((sum, r) => sum + r.actual, 0);
		const contributing = uniqueById(
			subResults.flatMap((r) => r.contributingCourses),
		);
		return {
			satisfied: subResults.every((r) => r.satisfied),
			required,
			actual,
			contributingCourses: contributing,
			subResults,
			diagnostics: [],
		};
	},
});
