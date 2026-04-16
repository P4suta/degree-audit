import { describe, expect, it } from "vitest";
import { Course } from "../../entities/course.ts";
import { CourseId } from "../../value-objects/course-id.ts";
import { Credit } from "../../value-objects/credit.ts";
import { Grade } from "../../value-objects/grade.ts";
import { SubjectCategory } from "../../value-objects/subject-category.ts";
import { elective } from "./elective.ts";

const course = (
	id: string,
	credit: number,
	category = SubjectCategory.electiveOwnCourse(),
) =>
	Course.of({
		id: CourseId.of(id),
		name: `n-${id}`,
		credit: Credit.of(credit),
		grade: Grade.Yu,
		category,
		rawCategoryLabel: "raw",
	});

describe("elective", () => {
	const spec = elective({
		id: "elective",
		label: "選択",
		required: 38,
		otherFacultyCap: 8,
	});

	it("counts all non-otherFaculty courses and caps otherFaculty at cap", () => {
		const pool = [
			course("own1", 20, SubjectCategory.electiveOwnCourse()),
			course("other1", 14, SubjectCategory.electiveOtherCourse()),
			course("fac1", 4, SubjectCategory.electiveOtherFaculty()),
			course("fac2", 4, SubjectCategory.electiveOtherFaculty()),
			course("fac3", 2, SubjectCategory.electiveOtherFaculty()), // exceeds 8 cap
		];
		const r = spec.evaluate({ pool });
		expect(r.actual).toBe(20 + 14 + 8); // fac3 excluded
		expect(r.satisfied).toBe(true);
		expect(r.contributingCourses).toHaveLength(4);
	});

	it("is not satisfied when below threshold", () => {
		const pool = [course("own1", 10)];
		const r = spec.evaluate({ pool });
		expect(r.actual).toBe(10);
		expect(r.satisfied).toBe(false);
	});

	it("reports otherFaculty contribution in diagnostics", () => {
		const pool = [course("fac1", 4, SubjectCategory.electiveOtherFaculty())];
		const r = spec.evaluate({ pool });
		expect(r.diagnostics.some((d) => d.includes("他学部"))).toBe(true);
	});

	it("does not add an otherFaculty course that would exceed the cap", () => {
		const pool = [
			course("fac1", 6, SubjectCategory.electiveOtherFaculty()),
			course("fac2", 6, SubjectCategory.electiveOtherFaculty()), // would exceed 8
		];
		const r = spec.evaluate({ pool });
		expect(r.actual).toBe(6);
		expect(r.contributingCourses).toHaveLength(1);
	});
});
