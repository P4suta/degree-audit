import type { Course } from "../domain/entities/course.ts";
import { isInProgress } from "../domain/value-objects/grade.ts";
import {
	kindDisplayName,
	type SubjectCategoryKind,
} from "../domain/value-objects/subject-category.ts";
import type { Assessment } from "./assess-graduation.ts";

/**
 * 各 kind が「本来どの要件に属するか（= natural home）」を示す対応表。
 * 読み替え判定に使う：pipeline が course を natural home 以外で消費していれば
 * それは「読み替え」「枠超過で移動」と表示できる。
 */
const NATURAL_HOME_BY_KIND: ReadonlyMap<SubjectCategoryKind, string> = new Map([
	["common-education/primary", "primary-12"],
	["common-education/liberal/field", "liberal"],
	["common-education/liberal/foreign-language", "liberal"],
	["common-education/liberal/career", "liberal"],
	["seminar/1-2", "seminar-12"],
	["seminar/3-4/spring", "seminar-34"],
	["seminar/3-4/fall", "seminar-34"],
	["seminar/5-6-thesis", "seminar-56"],
	["platform/basic-a", "platform"],
	["platform/basic-b", "platform"],
	["platform/foreign-language", "platform"],
	["platform/advanced", "platform"],
	["elective/own-course", "elective-38"],
	["elective/other-course", "elective-38"],
	["elective/other-faculty", "elective-38"],
] as const);

export type CourseStatus =
	| {
			/** その要件の必要単位にカウントされている科目。 */
			readonly kind: "counted";
			/** 消費されている要件 id。 */
			readonly requirementId: string;
			/** natural home と異なる場合のみ true（= 読み替え）。 */
			readonly reallocated: boolean;
			/** natural home の要件 id（kind から逆引き）。 */
			readonly naturalHome: string | null;
	  }
	| {
			/** 要件の必要単位を超えて取ったが、下流にも読み替えられなかった科目。
			 *  例: 教養 28 を超過した liberal/field 14 単位 など。 */
			readonly kind: "unused-overflow";
			readonly naturalHome: string | null;
	  }
	| {
			/** 上限（他学部 8 / 16 単位枠）で算入されなかった科目。 */
			readonly kind: "excluded";
			readonly reason: string;
			readonly naturalHome: string | null;
	  }
	| {
			/** 履修中（評価未確定）。現時点の卒業単位からは除外されるが、
			 *  「合格すればどこに算入されるか」の tentative では算入候補になる。 */
			readonly kind: "in-progress";
			readonly naturalHome: string | null;
	  }
	| {
			/** 不合格 / 未評価 の科目。卒業単位からは除外される。 */
			readonly kind: "not-passed";
			readonly naturalHome: string | null;
	  };

export interface CourseAllocation {
	readonly course: Course;
	readonly status: CourseStatus;
}

/**
 * Assessment から「各科目がどこでカウントされているか」を計算する。
 * UI で読み替え・枠超過を視覚化するための中間データ。
 */
export const viewCourseAllocations = (
	assessment: Assessment,
	allCourses: readonly Course[],
	passedCourseIds: ReadonlySet<string>,
): ReadonlyMap<string, CourseAllocation> => {
	const result = new Map<string, CourseAllocation>();

	// ステップごとの consumedCourseIds（pipeline が "consumed" 扱いにしたもの）。
	// パイプライン設計上、consumed な course は `remaining` から外れて次の step に
	// 渡らないので、同一 course が複数 step に現れることはない
	const consumedByStep = new Map<string, string>(); // courseId -> stepId
	for (const step of assessment.steps) {
		for (const id of step.consumedCourseIds) {
			consumedByStep.set(id, step.id);
		}
	}

	// elective は "observe" なので pipeline では consume されないが、
	// contributingCourses に載ったら「選択で算入」として扱う
	const electiveStep = assessment.steps.find((s) => s.id === "elective-38");
	const electiveContributingIds = new Set<string>(
		(electiveStep?.result.contributingCourses ?? []).map((c) => c.id as string),
	);

	// 除外された科目（上限超過で算入外）
	const excludedByCourseId = new Map<string, string>(); // courseId -> reason
	for (const step of assessment.steps) {
		for (const ex of step.result.excludedCourses ?? []) {
			excludedByCourseId.set(ex.course.id as string, ex.reason);
		}
	}

	for (const course of allCourses) {
		const id = course.id as string;
		const kind = course.category.kind;
		const naturalHome = NATURAL_HOME_BY_KIND.get(kind) ?? null;

		if (!passedCourseIds.has(id)) {
			if (isInProgress(course.grade)) {
				result.set(id, {
					course,
					status: { kind: "in-progress", naturalHome },
				});
			} else {
				result.set(id, {
					course,
					status: { kind: "not-passed", naturalHome },
				});
			}
			continue;
		}

		const consumedBy = consumedByStep.get(id);
		if (consumedBy !== undefined) {
			result.set(id, {
				course,
				status: {
					kind: "counted",
					requirementId: consumedBy,
					reallocated: naturalHome !== null && naturalHome !== consumedBy,
					naturalHome,
				},
			});
			continue;
		}

		if (electiveContributingIds.has(id)) {
			result.set(id, {
				course,
				status: {
					kind: "counted",
					requirementId: "elective-38",
					reallocated: naturalHome !== null && naturalHome !== "elective-38",
					naturalHome,
				},
			});
			continue;
		}

		const excludedReason = excludedByCourseId.get(id);
		if (excludedReason !== undefined) {
			result.set(id, {
				course,
				status: { kind: "excluded", reason: excludedReason, naturalHome },
			});
			continue;
		}

		// どの要件にも拾われなかった = 余剰（教養超過など）
		result.set(id, {
			course,
			status: { kind: "unused-overflow", naturalHome },
		});
	}

	return result;
};

/** 要件 id から、画面表示用のラベルを引く。 */
export const requirementDisplayName = (requirementId: string): string => {
	switch (requirementId) {
		case "primary-12":
			return "初年次科目";
		case "liberal":
			return "教養科目";
		case "seminar-12":
			return "ゼミナール I・II";
		case "seminar-34":
			return "ゼミナール III・IV";
		case "seminar-56":
			return "卒業論文・ゼミナール V・VI";
		case "platform":
			return "プラットフォーム科目";
		case "elective-38":
			return "選択科目";
		case "total-124":
			return "総修得単位";
		case "thesis-eligibility":
			return "卒業論文履修資格";
		default:
			return requirementId;
	}
};

/** kind を画面表示用ラベルに。 */
export const courseKindDisplayName = (kind: SubjectCategoryKind): string =>
	kindDisplayName(kind);
