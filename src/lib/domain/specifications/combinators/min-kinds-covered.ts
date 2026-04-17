import type { Course } from "../../entities/course.ts";
import {
	kindDisplayName,
	type SubjectCategoryKind,
} from "../../value-objects/subject-category.ts";
import type { EvalContext, Specification, SpecResult } from "../types.ts";

/**
 * 「指定 kind のうち N 種類以上を、1 kind あたり最低 M 単位カバーする。さらに
 * その合計単位数が T 以上」という要件を表現する。
 *
 * 例：R6+ 教養 7 分野のうち 3 分野以上にわたって合計 8 単位以上
 *   - kinds: 7 分野の kind
 *   - requiredCreditsPerKind: 1（1 単位でもあれば "カバー" とみなす）
 *   - requiredKindCount: 3
 *   - totalMinCredits: 8
 *
 * 設計の方針は `min-fields-covered.ts` に合わせてある（unit は "分野" と
 * "単位" の 2 段階評価で分かりにくくなるので、表示単位は primary 判定の方
 * （= requiredKindCount）に寄せている）。totalMinCredits は subResults
 * 相当の情報で、診断メッセージに載せる
 */
export const minKindsCovered = (options: {
	readonly id: string;
	readonly label: string;
	readonly kinds: readonly SubjectCategoryKind[];
	readonly requiredCreditsPerKind: number;
	readonly requiredKindCount: number;
	readonly totalMinCredits?: number;
}): Specification => {
	const kindSet = new Set<SubjectCategoryKind>(options.kinds);
	return {
		id: options.id,
		label: options.label,
		evaluate: (ctx: EvalContext): SpecResult => {
			const creditsByKind = new Map<SubjectCategoryKind, number>();
			const contributing: Course[] = [];
			let totalCredits = 0;
			for (const course of ctx.pool) {
				const kind = course.category.kind;
				if (!kindSet.has(kind)) continue;
				const prev = creditsByKind.get(kind) ?? 0;
				creditsByKind.set(kind, prev + (course.credit as number));
				totalCredits += course.credit as number;
				contributing.push(course);
			}
			const coveredKinds = options.kinds.filter(
				(k) => (creditsByKind.get(k) ?? 0) >= options.requiredCreditsPerKind,
			);
			const kindCountSatisfied =
				coveredKinds.length >= options.requiredKindCount;
			const totalSatisfied =
				options.totalMinCredits === undefined
					? true
					: totalCredits >= options.totalMinCredits;
			const satisfied = kindCountSatisfied && totalSatisfied;
			const diagnostics: string[] = [
				`充足分野 ${coveredKinds.length} / ${options.requiredKindCount}`,
			];
			if (options.totalMinCredits !== undefined) {
				diagnostics.push(
					`合計 ${totalCredits} / ${options.totalMinCredits} 単位`,
				);
			}
			for (const k of options.kinds) {
				diagnostics.push(
					`${kindDisplayName(k)}: ${creditsByKind.get(k) ?? 0} 単位`,
				);
			}
			return {
				satisfied,
				required: options.requiredKindCount,
				actual: coveredKinds.length,
				contributingCourses: contributing,
				subResults: [],
				diagnostics,
				unit: "分野",
			};
		},
	};
};
