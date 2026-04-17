import type { Course } from "../domain/entities/course.ts";
import { isInProgress } from "../domain/value-objects/grade.ts";
import {
	kindDisplayName,
	type SubjectCategoryKind,
} from "../domain/value-objects/subject-category.ts";
import type { Assessment } from "./assess-graduation.ts";

/**
 * 各 kind に対する「本来の要件（natural home）」候補 id のリスト。先頭から
 * 走査して、実際の `assessment.steps` に存在する id を natural home とする。
 *
 * ruleset（R2-R5 vs R6+）によって実際に走る要件 id が違うので、候補を並べて
 * 「どちらの ruleset で resolve されたか」を after-the-fact に反映する形。
 * 1 つの assessment には片方の ruleset しか入らないので、候補リストの中から
 * 有効なのはせいぜい 1 つ。
 */
type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

const NATURAL_HOME_CANDIDATES: ReadonlyMap<
	SubjectCategoryKind,
	NonEmptyReadonlyArray<string>
> = new Map([
	// R2-R5
	["common-education/primary", ["primary-12"]],
	["common-education/liberal/field", ["liberal"]],
	["common-education/liberal/foreign-language", ["liberal"]],
	["common-education/liberal/career", ["liberal"]],
	// R6+ 導入
	["common-education/introductory/core-learning", ["introductory-group"]],
	["common-education/introductory/core-english", ["introductory-group"]],
	["common-education/introductory/foreign-language", ["introductory-group"]],
	["common-education/introductory/math-ai", ["introductory-group"]],
	// R6+ 教養
	["common-education/liberal-group/life", ["liberal-group"]],
	["common-education/liberal-group/health-sports", ["liberal-group"]],
	["common-education/liberal-group/career", ["liberal-group"]],
	["common-education/liberal-group/arts", ["liberal-group"]],
	["common-education/liberal-group/humanities-social", ["liberal-group"]],
	["common-education/liberal-group/natural-science", ["liberal-group"]],
	["common-education/liberal-group/complex", ["liberal-group"]],
	// 両制度共通
	["seminar/1-2", ["seminar-12"]],
	["seminar/3-4/spring", ["seminar-34"]],
	["seminar/3-4/fall", ["seminar-34"]],
	["seminar/5-6-thesis", ["seminar-56"]],
	// PF（R2-R5 / R6+ どちらも step id は "platform"）
	["platform/basic-a", ["platform"]],
	["platform/basic-b", ["platform"]],
	["platform/foreign-language", ["platform"]],
	["platform/advanced", ["platform"]],
	["platform/faculty-common", ["platform"]],
	["platform/humanities", ["platform"]],
	["platform/global-studies", ["platform"]],
	["platform/social-science", ["platform"]],
	// 選択は ruleset で 38 / 42 に分かれる
	["elective/own-course", ["elective-38", "elective-42"]],
	["elective/other-course", ["elective-38", "elective-42"]],
	["elective/other-faculty", ["elective-38", "elective-42"]],
] as const);

const resolveNaturalHome = (
	kind: SubjectCategoryKind,
	stepIds: ReadonlySet<string>,
): string | null => {
	const candidates = NATURAL_HOME_CANDIDATES.get(kind);
	if (candidates === undefined) return null;
	for (const id of candidates) {
		if (stepIds.has(id)) return id;
	}
	// どの候補も step に無い場合は最初の候補を返す（実際には ruleset 内に
	// 必ず候補のどれかが存在するので到達しにくい）。tuple 型で候補非空を保証
	return candidates[0];
};

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
	// contributingCourses に載ったら「選択で算入」として扱う。R2-R5 では
	// "elective-38"、R6+ では "elective-42" にスイッチするので、どちらであっても
	// 先頭一致する選択ステップを見つける
	const electiveStep = assessment.steps.find((s) =>
		s.id.startsWith("elective-"),
	);
	const electiveStepId = electiveStep?.id ?? null;
	const electiveContributingIds = new Set<string>(
		(electiveStep?.result.contributingCourses ?? []).map((c) => c.id as string),
	);

	// 現 assessment に存在する step id の集合（natural home 候補の resolve に使う）
	const stepIds = new Set<string>(assessment.steps.map((s) => s.id));

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
		const naturalHome = resolveNaturalHome(kind, stepIds);

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

		if (electiveStepId !== null && electiveContributingIds.has(id)) {
			result.set(id, {
				course,
				status: {
					kind: "counted",
					requirementId: electiveStepId,
					reallocated: naturalHome !== null && naturalHome !== electiveStepId,
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
		// R2-R5
		case "primary-12":
			return "初年次科目";
		case "liberal":
			return "教養科目";
		// R6+
		case "introductory-group":
			return "導入科目群";
		case "liberal-group":
			return "教養科目群";
		// 両制度共通
		case "seminar-12":
			return "ゼミナール I・II";
		case "seminar-34":
			return "ゼミナール III・IV";
		case "seminar-56":
			return "卒業論文・ゼミナール V・VI";
		case "platform":
			return "プラットフォーム科目";
		case "elective-38":
		case "elective-42":
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
