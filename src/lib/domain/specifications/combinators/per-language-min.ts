import type { Course } from "../../entities/course.ts";
import {
	isKind,
	type SubjectCategory,
} from "../../value-objects/subject-category.ts";
import type { EvalContext, Specification, SpecResult } from "../types.ts";

const languageOf = (category: SubjectCategory): string | undefined => {
	if (isKind(category, "common-education/liberal/foreign-language")) {
		return category.language;
	}
	return undefined;
};

export const perLanguageMin = (options: {
	readonly id: string;
	readonly label: string;
	readonly requiredPerLanguage: number;
	readonly requiredLanguageCount: number;
}): Specification => ({
	id: options.id,
	label: options.label,
	evaluate: (ctx: EvalContext): SpecResult => {
		const creditsByLanguage = new Map<string, number>();
		const contributing: Course[] = [];
		for (const course of ctx.pool) {
			const lang = languageOf(course.category);
			if (lang !== undefined) {
				creditsByLanguage.set(
					lang,
					(creditsByLanguage.get(lang) ?? 0) + (course.credit as number),
				);
				contributing.push(course);
			}
		}
		const qualifiedLanguages = [...creditsByLanguage.entries()].filter(
			([, credits]) => credits >= options.requiredPerLanguage,
		);
		const satisfied =
			qualifiedLanguages.length >= options.requiredLanguageCount;
		const diagnostics = [
			`${qualifiedLanguages.length} / ${options.requiredLanguageCount} 言語が ${options.requiredPerLanguage} 単位以上`,
			...[...creditsByLanguage.entries()].map(
				([lang, credits]) => `${lang}: ${credits} 単位`,
			),
		];
		return {
			satisfied,
			required: options.requiredLanguageCount,
			actual: qualifiedLanguages.length,
			contributingCourses: contributing,
			subResults: [],
			diagnostics,
		};
	},
});
