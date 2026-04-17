import type { Course } from "../../entities/course.ts";
import {
	kindDisplayName,
	type SubjectCategoryKind,
} from "../../value-objects/subject-category.ts";
import type {
	EvalContext,
	ExcludedCourse,
	Specification,
	SpecResult,
} from "../types.ts";

/**
 * 選択科目要件。leftoverPool（ゼミ超過 / PF 超過 + 他コース・他学部・自コース科目）
 * から required 単位を積み上げる。
 *
 * フィルタ:
 *   - `upstreamHandledKinds`：上流要件（初年次・教養・卒論ゼミ V-VI 等）で
 *     既にカウントされるべき kind は診断にも出さず無言でスキップ
 *   - `allowedKinds`：選択 38 に算入可能な kind ホワイトリスト
 *   - `otherFacultyCap`：他学部科目単独の上限（規定上は 8 単位）
 *   - `frameKinds` + `frameCap`：他コース + 他学部 + PF 超過 の合算上限
 *     （規定上は 16 単位枠）
 *
 * 割当順（priority）:
 *   allowedKinds に入る科目を以下の順で積む。
 *   1. 非フレーム kind（自コース・ゼミ超過） — 枠関係なしに全量算入
 *   2. フレーム kind のうち 他学部（= elective/other-faculty）から
 *      → 絶対 cap 8 があるので、後回しにすると他で枠を使い切って算入できない
 *        ケースが出る。優先的に枠へ入れる
 *   3. 他コース（= elective/other-course）
 *   4. PF 超過（platform/*）
 *
 *   いずれも cap に当たったものは `excludedCourses` に reason 付きで保持し、
 *   UI が「枠超過で算入外」と見せられるようにする（フレームにそもそも
 *   入らなかった科目が「消失」しないようにするため）。
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

	const framePriority = (kind: SubjectCategoryKind): number => {
		if (kind === "elective/other-faculty") return 0;
		if (kind === "elective/other-course") return 1;
		return 2; // platform/*
	};

	return {
		id: options.id,
		label: options.label,
		evaluate: (ctx: EvalContext): SpecResult => {
			const nonFrame: Course[] = [];
			const frameCandidates: Course[] = [];
			const disallowedByKind = new Map<SubjectCategoryKind, number>();

			for (const course of ctx.pool) {
				const kind = course.category.kind;
				if (upstreamHandledSet.has(kind)) continue;
				if (!allowedKindSet.has(kind)) {
					const credit = course.credit as number;
					disallowedByKind.set(
						kind,
						(disallowedByKind.get(kind) ?? 0) + credit,
					);
					continue;
				}
				if (frameKindSet.has(kind)) frameCandidates.push(course);
				else nonFrame.push(course);
			}

			// フレーム候補は priority で安定ソート（同 priority 内は pool 順）
			frameCandidates.sort(
				(a, b) =>
					framePriority(a.category.kind) - framePriority(b.category.kind),
			);

			const contributing: Course[] = [];
			const excluded: ExcludedCourse[] = [];
			let actual = 0;
			let frameUsed = 0;
			let otherFacultyUsed = 0;
			let otherFacultyExcluded = 0;
			let frameExcluded = 0;

			// 1. 非フレーム kind（自コース / ゼミ超過）は無条件算入
			for (const course of nonFrame) {
				contributing.push(course);
				actual += course.credit as number;
			}

			// 2. フレーム kind を priority 順に検討
			for (const course of frameCandidates) {
				const credit = course.credit as number;
				const kind = course.category.kind;

				if (kind === "elective/other-faculty") {
					if (otherFacultyUsed + credit > options.otherFacultyCap) {
						otherFacultyExcluded += credit;
						excluded.push({
							course,
							reason: `他学部 ${options.otherFacultyCap} 単位上限超過で算入外`,
						});
						continue;
					}
				}
				if (frameUsed + credit > options.frameCap) {
					frameExcluded += credit;
					excluded.push({
						course,
						reason: `${options.frameCap} 単位枠（他コース + 他学部 + PF 超過）超過で算入外`,
					});
					continue;
				}
				contributing.push(course);
				actual += credit;
				frameUsed += credit;
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
				...(excluded.length > 0 ? { excludedCourses: excluded } : {}),
			};
		},
	};
};
