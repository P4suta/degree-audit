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

export const anyOf = (options: {
	readonly id: string;
	readonly label: string;
	readonly specs: readonly Specification[];
}): Specification => ({
	id: options.id,
	label: options.label,
	evaluate: (ctx: EvalContext): SpecResult => {
		const subResults = options.specs.map((s) => s.evaluate(ctx));
		const required = Math.max(0, ...subResults.map((r) => r.required));
		const actual = Math.max(0, ...subResults.map((r) => r.actual));
		const contributing = uniqueById(
			subResults.flatMap((r) => r.contributingCourses),
		);
		return {
			satisfied: subResults.some((r) => r.satisfied),
			required,
			actual,
			contributingCourses: contributing,
			subResults,
			diagnostics: [],
		};
	},
});
