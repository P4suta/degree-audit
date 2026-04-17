import type { Course } from "../../entities/course.ts";
import { matchKey } from "../../text/normalize.ts";
import type { EvalContext, Specification, SpecResult } from "../types.ts";

export interface RequiredSubject {
	readonly key: string;
	readonly displayName: string;
	/** `course.name` に対して適用するマッチャー。未指定時は `matchKey(name).includes(matchKey(key))`。 */
	readonly matches?: (course: Course) => boolean;
}

/**
 * 指定した科目名の集合をすべて（1 科目以上）修得していることを要求する。
 * 単位合計ではなく「どの科目を取ったか」を見るため、高知大学の初年次科目
 * （大学基礎論・大学英語入門・英会話・情報処理・学問基礎論・課題探求実践セミナー）
 * のような固定必修リストを表現するのに使う。
 *
 * マッチは `matchKey()` 経由で正規化して比較する（NFKC + 装飾記号除去
 * + 空白除去 + 小文字化）。「大学英語入門 I」「大学英語入門Ⅱ」などの揺れを
 * 1 つの key で吸収できる。
 *
 * `subResults` に各必修科目の取得状況を 1 件ずつ積み、`satisfied` は全件
 * 取得でのみ true。
 */
export const requireNamedSubjects = (options: {
	readonly id: string;
	readonly label: string;
	readonly required: readonly RequiredSubject[];
}): Specification => {
	const targets = options.required.map((r) => {
		const normalizedKey = matchKey(r.key);
		return {
			...r,
			normalizedKey,
			matches:
				r.matches ??
				((course: Course) => matchKey(course.name).includes(normalizedKey)),
		};
	});
	return {
		id: options.id,
		label: options.label,
		evaluate: (ctx: EvalContext): SpecResult => {
			const subResults: SpecResult[] = [];
			const contributing: Course[] = [];
			const missingNames: string[] = [];
			let actual = 0;
			for (const target of targets) {
				const matched = ctx.pool.filter((c) => target.matches(c));
				const credits = matched.reduce(
					(sum, c) => sum + (c.credit as number),
					0,
				);
				const hasAny = matched.length > 0;
				if (hasAny) {
					contributing.push(...matched);
					actual += 1;
				} else {
					missingNames.push(`未取得: ${target.displayName}`);
				}
				subResults.push({
					satisfied: hasAny,
					required: 1,
					actual: hasAny ? 1 : 0,
					contributingCourses: matched,
					subResults: [],
					diagnostics: [
						`${target.displayName}：${hasAny ? `取得済み（${credits} 単位）` : "未取得"}`,
					],
				});
			}
			const satisfied = actual === targets.length;
			const diagnostics = [
				`${actual} / ${targets.length} 科目 取得済み`,
				...missingNames,
			];
			return {
				satisfied,
				required: targets.length,
				actual,
				contributingCourses: contributing,
				subResults,
				diagnostics,
				unit: "科目",
			};
		},
	};
};
