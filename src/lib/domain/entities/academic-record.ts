import { Credit } from "../value-objects/credit.ts";
import { isInProgress, isPassing } from "../value-objects/grade.ts";
import type { SubjectCategoryKind } from "../value-objects/subject-category.ts";
import type { Course } from "./course.ts";
import type { StudentProfile } from "./student-profile.ts";

export interface AcademicRecord {
	readonly profile: StudentProfile;
	readonly courses: readonly Course[];
}

export const AcademicRecord = {
	of: (
		profile: StudentProfile,
		courses: readonly Course[],
	): AcademicRecord => ({
		profile,
		courses,
	}),

	passedCourses: (record: AcademicRecord): readonly Course[] =>
		record.courses.filter((c) => isPassing(c.grade)),

	/**
	 * 履修中（評価未確定）の科目。現時点の卒業判定には算入されないが、
	 * 「すべて合格した場合」の tentative 判定に使う。
	 */
	inProgressCourses: (record: AcademicRecord): readonly Course[] =>
		record.courses.filter((c) => isInProgress(c.grade)),

	/**
	 * passed courses に履修中を加えた集合。tentative 判定の入力になる。
	 */
	passedOrInProgressCourses: (record: AcademicRecord): readonly Course[] =>
		record.courses.filter((c) => isPassing(c.grade) || isInProgress(c.grade)),

	totalCredits: (record: AcademicRecord): Credit =>
		Credit.sum(AcademicRecord.passedCourses(record).map((c) => c.credit)),

	inProgressCredits: (record: AcademicRecord): Credit =>
		Credit.sum(AcademicRecord.inProgressCourses(record).map((c) => c.credit)),

	coursesByKind: (
		record: AcademicRecord,
		kind: SubjectCategoryKind,
	): readonly Course[] =>
		AcademicRecord.passedCourses(record).filter(
			(c) => c.category.kind === kind,
		),

	creditsByKind: (record: AcademicRecord, kind: SubjectCategoryKind): Credit =>
		Credit.sum(AcademicRecord.coursesByKind(record, kind).map((c) => c.credit)),
} as const;
