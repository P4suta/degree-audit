import type { Course } from "../../entities/course.ts";
import {
	kindDisplayName,
	type SubjectCategoryKind,
} from "../../value-objects/subject-category.ts";
import type { EvalContext, Specification, SpecResult } from "../types.ts";

/**
 * 選択科目要件。leftoverPool（ゼミ超過 / PF 超過 + 他コース・他学部・自コース科目）
 * から required 単位を積み上げる。
 *
 * 4 段のフィルタを持つ：
 *   - `upstreamHandledKinds`：上流要件（初年次・教養・卒論ゼミ V-VI 等）で
 *     既にカウントされるべき kind。pool に残っていても選択 38 には関係しない
 *     ため **診断にも出さず無言で除外**する。これが無いと超過や cap-excluded で
 *     pool に残った上流 kind が「対象外 kind」と誤報される
 *   - `allowedKinds`：選択 38 に算入可能な kind ホワイトリスト（Kochi では
 *     自コース + ゼミ I-IV 超過 + 他コース + 他学部 + PF 超過）。
 *     ここに無い kind のうち upstream 扱いでないものは診断に載る
 *   - `otherFacultyCap`：他学部科目単独の上限（Kochi では 8 単位）
 *   - `frameKinds` + `frameCap`：他コース + 他学部 + PF 超過の合算上限
 *     （Kochi では 16 単位枠）。この枠の中で上記 otherFacultyCap がさらに効く
 *
 * 判定順序は pool の順（＝ pipeline から流れてきた順）。上限を超える科目・
 * 真に想定外の kind は contributingCourses から除外し、diagnostics で明示する。
 */
export const elective = (options: {
	readonly id: string;
	readonly label: string;
	readonly required: number;
	readonly allowedKinds: readonly SubjectCategoryKind[];
	readonly upstreamHandledKinds?: readonly SubjectCategoryKind[];
	readonly otherFacultyCap: number;
	readonly frameKinds: readonly SubjectCategoryKind[];
	readonly frameCap: number;
}): Specification => {
	const allowedKindSet = new Set<SubjectCategoryKind>(options.allowedKinds);
	const upstreamHandledSet = new Set<SubjectCategoryKind>(
		options.upstreamHandledKinds ?? [],
	);
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
			const disallowedByKind = new Map<SubjectCategoryKind, number>();
			for (const course of ctx.pool) {
				const credit = course.credit as number;
				const kind = course.category.kind;
				// upstream で既に消費されるべき kind は診断に出さず無言でスキップ
				if (upstreamHandledSet.has(kind)) continue;
				if (!allowedKindSet.has(kind)) {
					disallowedByKind.set(
						kind,
						(disallowedByKind.get(kind) ?? 0) + credit,
					);
					continue;
				}
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
			for (const [kind, total] of disallowedByKind) {
				diagnostics.push(
					`${kindDisplayName(kind)} の ${total} 単位は選択科目には算入できません`,
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
