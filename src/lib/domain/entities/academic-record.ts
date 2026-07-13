import { isPassing } from "../value-objects/grade.ts";
import type { Course } from "./course.ts";
import type { StudentProfile } from "./student-profile.ts";

export interface AcademicRecord {
	readonly profile: StudentProfile;
	readonly courses: readonly Course[];
}

export const AcademicRecord = {
	passedCourses: (record: AcademicRecord): readonly Course[] =>
		record.courses.filter((c) => isPassing(c.grade)),
} as const;
