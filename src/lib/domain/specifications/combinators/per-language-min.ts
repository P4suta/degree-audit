import type { Course } from "../../entities/course.ts";
import { matchKey } from "../../text/normalize.ts";
import type {
	SubjectCategory,
	SubjectCategoryKind,
} from "../../value-objects/subject-category.ts";
import type { EvalContext, Specification, SpecResult } from "../types.ts";

/**
 * `language` フィールドを持つ kind の列挙。R2-R5 では教養配下、R6+ では
 * 導入配下の 初修外国語 kind も language を持つので、新 kind を導入するたび
 * にここへ追加する。
 */
const LANGUAGE_BEARING_KINDS: readonly SubjectCategoryKind[] = [
	"common-education/liberal/foreign-language",
	"common-education/introductory/foreign-language",
];

const extractLanguage = (
	category: SubjectCategory,
	allowedKinds: ReadonlySet<SubjectCategoryKind>,
): string | undefined => {
	// language を持つ kind は LANGUAGE_BEARING_KINDS で型に固定しているので、
	// allowedKinds の外なら即 undefined。中なら必ず language を持つ
	if (
		category.kind === "common-education/liberal/foreign-language" ||
		category.kind === "common-education/introductory/foreign-language"
	) {
		if (!allowedKinds.has(category.kind)) return undefined;
		return category.language;
	}
	return undefined;
};

/**
 * 外国語 1 言語あたり n 単位以上の言語が m 言語以上ある、という条件を評価する。
 *
 * `allowedLanguages` を指定すると、その集合に含まれる言語のみを対象にする
 * （例：必修対象が 独/仏/中/韓/朝/西 の 6 言語で、英語は対象外）。
 * 言語名の比較は `matchKey` を通して全角/半角・装飾記号の揺れを吸収する。
 *
 * `kinds` で対象 kind を絞り込める。省略時は R2-R5 の教養外国語のみ
 * （`common-education/liberal/foreign-language`）。R6+ では導入配下の
 * `common-education/introductory/foreign-language` を指定する。
 */
export const perLanguageMin = (options: {
	readonly id: string;
	readonly label: string;
	readonly requiredPerLanguage: number;
	readonly requiredLanguageCount: number;
	readonly allowedLanguages?: readonly string[];
	readonly kinds?: readonly SubjectCategoryKind[];
}): Specification => {
	const kindSet = new Set<SubjectCategoryKind>(
		options.kinds ?? ["common-education/liberal/foreign-language"],
	);
	// language を持たない kind が渡された場合は早期に気付くよう assert
	for (const k of kindSet) {
		if (!LANGUAGE_BEARING_KINDS.includes(k)) {
			throw new Error(
				`perLanguageMin: kind "${k}" does not carry a language field`,
			);
		}
	}
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
				const lang = extractLanguage(course.category, kindSet);
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
