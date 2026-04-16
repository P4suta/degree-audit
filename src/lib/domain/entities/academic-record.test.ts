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

const course = (
	id: string,
	credit: number,
	grade: Grade,
	kind: Parameters<typeof SubjectCategory.primary> | SubjectCategory,
): Course =>
	Course.of({
		id: CourseId.of(id),
		name: `name-${id}`,
		credit: Credit.of(credit),
		grade,
		category: Array.isArray(kind)
			? SubjectCategory.primary()
			: (kind as SubjectCategory),
		rawCategoryLabel: "raw",
	});

describe("AcademicRecord", () => {
	const passed1 = course("C1", 2, Grade.Yu, SubjectCategory.primary());
	const passed2 = course("C2", 4, Grade.Nintei, SubjectCategory.seminar12());
	const failed = course("C3", 2, Grade.Fuka, SubjectCategory.primary());
	const withdrew = course("C4", 2, Grade.Torikeshi, SubjectCategory.primary());
	const record = AcademicRecord.of(profile, [
		passed1,
		passed2,
		failed,
		withdrew,
	]);

	it("of stores profile and courses verbatim", () => {
		expect(record.profile).toBe(profile);
		expect(record.courses).toHaveLength(4);
	});

	it("passedCourses filters to passing grades", () => {
		expect(AcademicRecord.passedCourses(record)).toEqual([passed1, passed2]);
	});

	it("totalCredits sums credits of passing courses only", () => {
		expect(Credit.toNumber(AcademicRecord.totalCredits(record))).toBe(6);
	});

	it("coursesByKind filters passing courses of the given kind", () => {
		const primaries = AcademicRecord.coursesByKind(
			record,
			"common-education/primary",
		);
		expect(primaries).toEqual([passed1]);
	});

	it("creditsByKind sums credits for the given kind", () => {
		const n = Credit.toNumber(
			AcademicRecord.creditsByKind(record, "seminar/1-2"),
		);
		expect(n).toBe(4);
	});

	it("passedCourses on empty record is empty", () => {
		const empty = AcademicRecord.of(profile, []);
		expect(AcademicRecord.passedCourses(empty)).toEqual([]);
		expect(Credit.toNumber(AcademicRecord.totalCredits(empty))).toBe(0);
		expect(
			AcademicRecord.coursesByKind(empty, "common-education/primary"),
		).toEqual([]);
	});
});
