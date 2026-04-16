import type { SubjectCategoryKind } from "../../value-objects/subject-category.ts";
import type { Specification } from "../types.ts";
import { minCredits } from "./min-credits.ts";

export const minCreditsInCategory = (options: {
	readonly id: string;
	readonly label: string;
	readonly required: number;
	readonly kinds: readonly SubjectCategoryKind[];
}): Specification => {
	const kindSet = new Set<SubjectCategoryKind>(options.kinds);
	return minCredits({
		id: options.id,
		label: options.label,
		required: options.required,
		predicate: (course) => kindSet.has(course.category.kind),
	});
};
