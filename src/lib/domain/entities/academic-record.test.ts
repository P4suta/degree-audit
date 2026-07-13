import { describe, expect, it } from "vitest";
import { isOk } from "../errors/result.ts";
import { CourseId } from "../value-objects/course-id.ts";
import { Credit } from "../value-objects/credit.ts";
import { Grade } from "../value-objects/grade.ts";
import { SubjectCategory } from "../value-objects/subject-category.ts";
import { AcademicRecord } from "./academic-record.ts";
import { Course } from "./course.ts";
import { StudentProfile } from "./student-profile.ts";

const profile = (() => {
	const r = StudentProfile.parse({
		facultyId: "humanities",
		courseId: "philosophy",
		matriculationYear: 2022,
	});
	if (!isOk(r)) throw new Error("fixture failed");
	return r.value;
})();

const course = (id: string, grade: Grade): Course =>
	Course.of({
		id: CourseId.of(id),
		name: `name-${id}`,
		credit: Credit.of(2),
		grade,
		category: SubjectCategory.primary(),
		rawCategoryLabel: "raw",
	});

describe("AcademicRecord.passedCourses", () => {
	it("filters to passing grades", () => {
		const passed1 = course("C1", Grade.Yu);
		const passed2 = course("C2", Grade.Nintei);
		const failed = course("C3", Grade.Fuka);
		const withdrew = course("C4", Grade.Torikeshi);
		const record: AcademicRecord = {
			profile,
			courses: [passed1, passed2, failed, withdrew],
		};
		expect(AcademicRecord.passedCourses(record)).toEqual([passed1, passed2]);
	});

	it("is empty for a record with no courses", () => {
		const record: AcademicRecord = { profile, courses: [] };
		expect(AcademicRecord.passedCourses(record)).toEqual([]);
	});
});
