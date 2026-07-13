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
	 * In-progress (grade pending) courses. Not counted toward graduation now,
	 * but used for the tentative "if all are passed" assessment.
	 */
	inProgressCourses: (record: AcademicRecord): readonly Course[] =>
		record.courses.filter((c) => isInProgress(c.grade)),

	/** Passed courses plus in-progress ones. Input to the tentative assessment. */
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
