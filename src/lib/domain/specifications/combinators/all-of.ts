import type { Course } from "../../entities/course.ts";
import type { EvalContext, Specification, SpecResult } from "../types.ts";

const uniqueById = (courses: readonly Course[]): readonly Course[] => {
	const seen = new Set<string>();
	const out: Course[] = [];
	for (const c of courses) {
		if (!seen.has(c.id)) {
			seen.add(c.id);
			out.push(c);
		}
	}
	return out;
};

/**
 * 複数の sub-spec がすべて満たされるときだけ satisfied にする。
 *
 * 集計された required / actual は **sub-spec の件数** ベースにしている。
 * 各 sub-spec が異なる単位（単位・分野・言語・科目）を持つ場合に、
 * それらを単純合算すると "18 / 18" のような意味不明な表示になってしまうため、
 * 外側の allOf は「満たした要件数 / 全要件数」として扱う。sub-spec 側の
 * 詳細は `subResults` でドリルダウンできる。
 */
export const allOf = (options: {
	readonly id: string;
	readonly label: string;
	readonly specs: readonly Specification[];
}): Specification => ({
	id: options.id,
	label: options.label,
	evaluate: (ctx: EvalContext): SpecResult => {
		const subResults = options.specs.map((s) => s.evaluate(ctx));
		const required = subResults.length;
		const actual = subResults.filter((r) => r.satisfied).length;
		const contributing = uniqueById(
			subResults.flatMap((r) => r.contributingCourses),
		);
		return {
			satisfied: subResults.every((r) => r.satisfied),
			required,
			actual,
			contributingCourses: contributing,
			subResults,
			diagnostics: [],
			unit: "要件",
		};
	},
});
