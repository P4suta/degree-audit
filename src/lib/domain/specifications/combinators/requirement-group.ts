import type { EvalContext, Specification, SpecResult } from "../types.ts";

/**
 * Wraps a primary spec with additional sub-checks (observe-only). Outer
 * required / actual / contributingCourses reflect the primary; sub-spec results
 * are attached for detailed reporting. Useful when you want the pipeline to
 * consume based on the primary threshold while still surfacing detailed
 * sub-requirements like per-field or per-language constraints.
 */
export const requirementGroup = (options: {
	readonly id: string;
	readonly label: string;
	readonly primary: Specification;
	readonly subSpecs: readonly Specification[];
}): Specification => ({
	id: options.id,
	label: options.label,
	evaluate: (ctx: EvalContext): SpecResult => {
		const primary = options.primary.evaluate(ctx);
		const subs = options.subSpecs.map((s) => s.evaluate(ctx));
		const satisfied = primary.satisfied && subs.every((r) => r.satisfied);
		return {
			satisfied,
			required: primary.required,
			actual: primary.actual,
			contributingCourses: primary.contributingCourses,
			subResults: [primary, ...subs],
			diagnostics: primary.diagnostics,
		};
	},
});
