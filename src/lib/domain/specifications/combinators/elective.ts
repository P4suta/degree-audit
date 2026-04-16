import type { Course } from "../../entities/course.ts";
import type { SubjectCategoryKind } from "../../value-objects/subject-category.ts";
import type { EvalContext, Specification, SpecResult } from "../types.ts";

/**
 * 選択科目要件。leftoverPool（ゼミ超過 / PF 超過 + 他コース・他学部・自コース科目）
 * から required 単位を積み上げる。
 *
 * 2 段の上限を持つ：
 *   - `otherFacultyCap`：他学部科目単独の上限（Kochi では 8 単位）
 *   - `frameKinds` + `frameCap`：他コース + 他学部 + PF 超過の合算上限
 *     （Kochi では 16 単位枠）。この枠の中で上記 otherFacultyCap がさらに効く
 *
 * 判定順序は pool の順（＝ pipeline から流れてきた順）。上限を超える科目は
 * contributingCourses から除外し、diagnostics で明示する。
 */
export const elective = (options: {
	readonly id: string;
	readonly label: string;
	readonly required: number;
	readonly otherFacultyCap: number;
	readonly frameKinds: readonly SubjectCategoryKind[];
	readonly frameCap: number;
}): Specification => {
	const frameKindSet = new Set<SubjectCategoryKind>(options.frameKinds);
	return {
		id: options.id,
		label: options.label,
		evaluate: (ctx: EvalContext): SpecResult => {
			const contributing: Course[] = [];
			let actual = 0;
			let frameUsed = 0;
			let otherFacultyUsed = 0;
			let otherFacultyExcluded = 0;
			let frameExcluded = 0;
			for (const course of ctx.pool) {
				const credit = course.credit as number;
				const kind = course.category.kind;
				const inFrame = frameKindSet.has(kind);
				if (kind === "elective/other-faculty") {
					if (otherFacultyUsed + credit > options.otherFacultyCap) {
						otherFacultyExcluded += credit;
						continue;
					}
				}
				if (inFrame && frameUsed + credit > options.frameCap) {
					frameExcluded += credit;
					continue;
				}
				contributing.push(course);
				actual += credit;
				if (inFrame) frameUsed += credit;
				if (kind === "elective/other-faculty") otherFacultyUsed += credit;
			}
			const satisfied = actual >= options.required;
			const diagnostics: string[] = [
				`${actual} / ${options.required} 単位`,
				`他学部科目：${otherFacultyUsed} / ${options.otherFacultyCap} 単位`,
				`${options.frameCap} 単位枠（他コース + 他学部 + PF 超過）：${frameUsed} / ${options.frameCap} 単位`,
			];
			if (otherFacultyExcluded > 0) {
				diagnostics.push(
					`他学部上限超過で ${otherFacultyExcluded} 単位が算入外`,
				);
			}
			if (frameExcluded > 0) {
				diagnostics.push(
					`${options.frameCap} 単位枠超過で ${frameExcluded} 単位が算入外`,
				);
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
