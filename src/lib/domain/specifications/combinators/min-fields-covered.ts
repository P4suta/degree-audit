import type { Course } from "../../entities/course.ts";
import {
	FIELD_CATEGORIES,
	FIELD_CATEGORY_LABELS,
	type FieldCategory,
} from "../../value-objects/field-category.ts";
import {
	isKind,
	type SubjectCategory,
} from "../../value-objects/subject-category.ts";
import type { EvalContext, Specification, SpecResult } from "../types.ts";

const fieldOf = (category: SubjectCategory): FieldCategory | undefined => {
	if (isKind(category, "common-education/liberal/field")) {
		return category.field;
	}
	return undefined;
};

export const minFieldsCovered = (options: {
	readonly id: string;
	readonly label: string;
	readonly requiredCreditsPerField: number;
	readonly requiredFieldCount: number;
}): Specification => ({
	id: options.id,
	label: options.label,
	evaluate: (ctx: EvalContext): SpecResult => {
		const creditsByField = new Map<FieldCategory, number>();
		const contributing: Course[] = [];
		for (const course of ctx.pool) {
			const field = fieldOf(course.category);
			if (field !== undefined) {
				const previous = creditsByField.get(field) ?? 0;
				creditsByField.set(field, previous + (course.credit as number));
				contributing.push(course);
			}
		}
		const coveredFields = FIELD_CATEGORIES.filter(
			(f) => (creditsByField.get(f) ?? 0) >= options.requiredCreditsPerField,
		);
		const satisfied = coveredFields.length >= options.requiredFieldCount;
		const diagnostics = [
			`充足分野 ${coveredFields.length} / ${options.requiredFieldCount}`,
			...FIELD_CATEGORIES.map(
				(f) =>
					`${FIELD_CATEGORY_LABELS[f]}: ${creditsByField.get(f) ?? 0} 単位`,
			),
		];
		return {
			satisfied,
			required: options.requiredFieldCount,
			actual: coveredFields.length,
			contributingCourses: contributing,
			subResults: [],
			diagnostics,
		};
	},
});
