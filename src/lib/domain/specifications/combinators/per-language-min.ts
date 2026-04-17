import type { Course } from "../../entities/course.ts";
import { matchKey } from "../../text/normalize.ts";
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

/**
 * 外国語 1 言語あたり n 単位以上の言語が m 言語以上ある、という条件を評価する。
 *
 * `allowedLanguages` を指定すると、その集合に含まれる言語のみを対象にする
 * （Kochi では必修対象が 独/仏/中/韓/朝/西 の 6 言語で、英語は対象外）。
 * 言語名の比較は `matchKey` を通して全角/半角・装飾記号の揺れを吸収する。
 */
export const perLanguageMin = (options: {
	readonly id: string;
	readonly label: string;
	readonly requiredPerLanguage: number;
	readonly requiredLanguageCount: number;
	readonly allowedLanguages?: readonly string[];
}): Specification => {
	const allowedKeys =
		options.allowedLanguages === undefined
			? undefined
			: new Set(options.allowedLanguages.map((l) => matchKey(l)));
	return {
		id: options.id,
		label: options.label,
		evaluate: (ctx: EvalContext): SpecResult => {
			const creditsByLanguage = new Map<string, number>();
			const contributing: Course[] = [];
			const excludedByLanguage = new Map<string, number>();
			for (const course of ctx.pool) {
				const lang = languageOf(course.category);
				if (lang === undefined) continue;
				if (allowedKeys !== undefined && !allowedKeys.has(matchKey(lang))) {
					excludedByLanguage.set(
						lang,
						(excludedByLanguage.get(lang) ?? 0) + (course.credit as number),
					);
					continue;
				}
				creditsByLanguage.set(
					lang,
					(creditsByLanguage.get(lang) ?? 0) + (course.credit as number),
				);
				contributing.push(course);
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
			for (const [lang, credits] of excludedByLanguage) {
				diagnostics.push(`${lang}: ${credits} 単位（必修対象言語外）`);
			}
			return {
				satisfied,
				required: options.requiredLanguageCount,
				actual: qualifiedLanguages.length,
				contributingCourses: contributing,
				subResults: [],
				diagnostics,
				unit: "言語",
			};
		},
	};
};
