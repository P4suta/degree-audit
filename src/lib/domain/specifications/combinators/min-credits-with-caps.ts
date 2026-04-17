import type { Course } from "../../entities/course.ts";
import type { SubjectCategoryKind } from "../../value-objects/subject-category.ts";
import type { EvalContext, Specification, SpecResult } from "../types.ts";

export interface PredicateCap {
	readonly id: string;
	readonly label: string;
	readonly predicate: (course: Course) => boolean;
	readonly cap: number;
}

/**
 * `minCreditsInCategory` の拡張：指定した kind の科目をまとめて `required` 単位要求する
 * 一方、特定の sub-kind / 述語グループに算入上限を設定できる。上限を超える科目は
 * 算入外として `actual` から除外し、diagnostics で明示する。
 *
 * 例: 高知大学「教養 合計 28単位」では次の 2 つの cap が掛かる
 *   - キャリア形成支援: kind `common-education/liberal/career` に 6 単位上限
 *   - スポーツ科学: `isSportsScience(course)` 述語に 4 単位上限
 * どちらの cap も独立に効き、満たされなければ `actual` に加算されない。
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
	readonly predicateCaps?: readonly PredicateCap[];
}): Specification => {
	const allowedKinds = new Set<SubjectCategoryKind>(options.kinds);
	const capEntries = Object.entries(options.caps) as ReadonlyArray<
		readonly [SubjectCategoryKind, number]
	>;
	const capMap = new Map<SubjectCategoryKind, number>(capEntries);
	const predicateCaps = options.predicateCaps ?? [];
	return {
		id: options.id,
		label: options.label,
		evaluate: (ctx: EvalContext): SpecResult => {
			const consumedPerKind = new Map<SubjectCategoryKind, number>();
			const rawTotalPerKind = new Map<SubjectCategoryKind, number>();
			const consumedPerPredicate = new Map<string, number>();
			const rawTotalPerPredicate = new Map<string, number>();
			const contributing: Course[] = [];
			let actual = 0;
			for (const course of ctx.pool) {
				const kind = course.category.kind;
				if (!allowedKinds.has(kind)) continue;
				const credit = course.credit as number;
				rawTotalPerKind.set(kind, (rawTotalPerKind.get(kind) ?? 0) + credit);
				const matchingPredicateCaps = predicateCaps.filter((pc) =>
					pc.predicate(course),
				);
				for (const pc of matchingPredicateCaps) {
					rawTotalPerPredicate.set(
						pc.id,
						(rawTotalPerPredicate.get(pc.id) ?? 0) + credit,
					);
				}
				const kindCap = capMap.get(kind);
				if (kindCap !== undefined) {
					const consumed = consumedPerKind.get(kind) ?? 0;
					if (consumed + credit > kindCap) continue;
				}
				const predicateCapExceeded = matchingPredicateCaps.some((pc) => {
					const consumed = consumedPerPredicate.get(pc.id) ?? 0;
					return consumed + credit > pc.cap;
				});
				if (predicateCapExceeded) continue;
				if (kindCap !== undefined) {
					consumedPerKind.set(kind, (consumedPerKind.get(kind) ?? 0) + credit);
				}
				for (const pc of matchingPredicateCaps) {
					consumedPerPredicate.set(
						pc.id,
						(consumedPerPredicate.get(pc.id) ?? 0) + credit,
					);
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
			for (const pc of predicateCaps) {
				const raw = rawTotalPerPredicate.get(pc.id) ?? 0;
				const counted = consumedPerPredicate.get(pc.id) ?? 0;
				if (raw > pc.cap) {
					diagnostics.push(
						`${pc.label} 上限 ${pc.cap} 単位（履修 ${raw} 単位、算入 ${counted} 単位、${raw - counted} 単位は卒業要件外）`,
					);
				} else if (raw > 0) {
					diagnostics.push(
						`${pc.label} ${counted} / ${pc.cap} 単位（上限枠内）`,
					);
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
