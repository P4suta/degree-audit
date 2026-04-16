import type { Course } from "../../entities/course.ts";
import type { SubjectCategoryKind } from "../../value-objects/subject-category.ts";
import type { EvalContext, Specification, SpecResult } from "../types.ts";

/**
 * `minCreditsInCategory` の拡張：指定した kind の科目をまとめて `required` 単位要求する
 * 一方、特定の sub-kind に `caps` で算入上限を設定できる。上限を超える科目は
 * 算入外として `actual` から除外し、diagnostics で明示する。
 *
 * 例: 高知大学「教養 合計 28単位」では `career` が上限 6 単位。career を 8 単位
 * 取っても 28 合計には 6 単位しか算入されない。この挙動を正しく表現するために
 * `minCreditsInCategory` ではなくこのコンビネータを使う。
 *
 * 判定順序は入力 pool の順（＝ MHTML の表示順、概ね履修順）。上限超過分は
 * 「後から履修した科目が卒業要件に入らない」という自然な挙動になる。
 */
export const minCreditsWithCaps = (options: {
	readonly id: string;
	readonly label: string;
	readonly required: number;
	readonly kinds: readonly SubjectCategoryKind[];
	readonly caps: Readonly<Partial<Record<SubjectCategoryKind, number>>>;
}): Specification => {
	const allowedKinds = new Set<SubjectCategoryKind>(options.kinds);
	const capEntries = Object.entries(options.caps) as ReadonlyArray<
		readonly [SubjectCategoryKind, number]
	>;
	const capMap = new Map<SubjectCategoryKind, number>(capEntries);
	return {
		id: options.id,
		label: options.label,
		evaluate: (ctx: EvalContext): SpecResult => {
			const consumedPerKind = new Map<SubjectCategoryKind, number>();
			const rawTotalPerKind = new Map<SubjectCategoryKind, number>();
			const contributing: Course[] = [];
			let actual = 0;
			for (const course of ctx.pool) {
				const kind = course.category.kind;
				if (!allowedKinds.has(kind)) continue;
				const credit = course.credit as number;
				rawTotalPerKind.set(kind, (rawTotalPerKind.get(kind) ?? 0) + credit);
				const cap = capMap.get(kind);
				if (cap !== undefined) {
					const consumed = consumedPerKind.get(kind) ?? 0;
					if (consumed + credit > cap) continue;
					consumedPerKind.set(kind, consumed + credit);
				}
				contributing.push(course);
				actual += credit;
			}
			const satisfied = actual >= options.required;
			const diagnostics: string[] = [
				satisfied
					? `${actual} / ${options.required} 単位を満たしています`
					: `${actual} / ${options.required} 単位。あと ${options.required - actual} 単位必要`,
			];
			for (const [kind, cap] of capEntries) {
				const raw = rawTotalPerKind.get(kind) ?? 0;
				const counted = consumedPerKind.get(kind) ?? 0;
				if (raw > cap) {
					diagnostics.push(
						`${kind} 上限 ${cap} 単位（履修 ${raw} 単位、算入 ${counted} 単位、${raw - counted} 単位は卒業要件外）`,
					);
				} else if (raw > 0) {
					diagnostics.push(`${kind} ${counted} / ${cap} 単位（上限枠内）`);
				}
			}
			return {
				satisfied,
				required: options.required,
				actual,
				contributingCourses: contributing,
				subResults: [],
				diagnostics,
			};
		},
	};
};
