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

const FRAME_KINDS = [
	"elective/other-course",
	"elective/other-faculty",
	"platform/basic-a",
	"platform/basic-b",
	"platform/foreign-language",
	"platform/advanced",
] as const;

const ALLOWED_KINDS = [
	"elective/own-course",
	"elective/other-course",
	"elective/other-faculty",
	"seminar/1-2",
	"seminar/3-4/spring",
	"seminar/3-4/fall",
	"platform/basic-a",
	"platform/basic-b",
	"platform/foreign-language",
	"platform/advanced",
] as const;

describe("elective", () => {
	const spec = elective({
		id: "elective",
		label: "選択",
		required: 38,
		allowedKinds: ALLOWED_KINDS,
		otherFacultyCap: 8,
		frameKinds: FRAME_KINDS,
		frameCap: 16,
	});

	it("ownCourse is outside the frame and counts unconditionally", () => {
		const pool = [
			course("own1", 20, SubjectCategory.electiveOwnCourse()),
			course("own2", 20, SubjectCategory.electiveOwnCourse()),
		];
		const r = spec.evaluate({ pool });
		expect(r.actual).toBe(40);
		expect(r.satisfied).toBe(true);
	});

	it("caps otherFaculty individually at otherFacultyCap and reports excess", () => {
		const pool = [
			course("fac1", 6, SubjectCategory.electiveOtherFaculty()),
			course("fac2", 6, SubjectCategory.electiveOtherFaculty()), // 12 > 8 → excluded
		];
		const r = spec.evaluate({ pool });
		expect(r.actual).toBe(6);
		expect(r.contributingCourses).toHaveLength(1);
		expect(r.diagnostics.some((d) => d.includes("他学部上限超過"))).toBe(true);
	});

	it("caps the frame at frameCap across other-course + other-faculty + PF overflow", () => {
		const pool = [
			course("other1", 10, SubjectCategory.electiveOtherCourse()),
			course("fac1", 4, SubjectCategory.electiveOtherFaculty()),
			course("pf1", 4, SubjectCategory.platformAdvanced()),
			// running total within frame: 10 + 4 + 4 = 18 > 16 → pf1 excluded (4)
		];
		const r = spec.evaluate({ pool });
		expect(r.actual).toBe(14);
		expect(r.diagnostics.some((d) => d.includes("枠超過"))).toBe(true);
	});

	it("applies otherFacultyCap before the frame cap when both would bite", () => {
		const pool = [
			course("fac1", 6, SubjectCategory.electiveOtherFaculty()),
			course("fac2", 6, SubjectCategory.electiveOtherFaculty()), // otherFaculty cap rejects
			course("other1", 12, SubjectCategory.electiveOtherCourse()), // frame: 6+12 = 18 > 16 → excluded
		];
		const r = spec.evaluate({ pool });
		expect(r.actual).toBe(6);
	});

	it("frame leftover does NOT count ownCourse toward the 16-unit cap", () => {
		const pool = [
			course("own1", 30, SubjectCategory.electiveOwnCourse()),
			course("other1", 16, SubjectCategory.electiveOtherCourse()),
		];
		const r = spec.evaluate({ pool });
		expect(r.actual).toBe(46);
	});

	it("is not satisfied when below required", () => {
		const pool = [course("own1", 10)];
		const r = spec.evaluate({ pool });
		expect(r.actual).toBe(10);
		expect(r.satisfied).toBe(false);
	});

	it("reports otherFaculty and frame usage in diagnostics even without overflow", () => {
		const pool = [
			course("fac1", 4, SubjectCategory.electiveOtherFaculty()),
			course("other1", 8, SubjectCategory.electiveOtherCourse()),
		];
		const r = spec.evaluate({ pool });
		expect(r.diagnostics.some((d) => d.includes("他学部科目"))).toBe(true);
		expect(r.diagnostics.some((d) => d.includes("16 単位枠"))).toBe(true);
	});

	it("excludes kinds not listed in allowedKinds (unknown, seminar V-VI, etc.)", () => {
		const pool = [
			course("own1", 30, SubjectCategory.electiveOwnCourse()),
			course("vvi1", 10, SubjectCategory.seminar56Thesis()),
			course("unk1", 10, SubjectCategory.unknown("??")),
		];
		const r = spec.evaluate({ pool });
		expect(r.actual).toBe(30);
		expect(r.contributingCourses.map((c) => c.id as string)).toEqual(["own1"]);
		expect(
			r.diagnostics.some((d) => d.includes("対象外 kind `seminar/5-6-thesis`")),
		).toBe(true);
		expect(r.diagnostics.some((d) => d.includes("対象外 kind `unknown`"))).toBe(
			true,
		);
	});

	it("counts all six eligible families (own, seminar I-II, seminar III-IV spring+fall, other-course, other-faculty, PF)", () => {
		const pool = [
			course("own1", 10, SubjectCategory.electiveOwnCourse()),
			course("s12", 2, SubjectCategory.seminar12()),
			course("s34s", 2, SubjectCategory.seminar34Spring()),
			course("s34f", 2, SubjectCategory.seminar34Fall()),
			course("other1", 4, SubjectCategory.electiveOtherCourse()),
			course("fac1", 4, SubjectCategory.electiveOtherFaculty()),
			course("pf1", 4, SubjectCategory.platformAdvanced()),
		];
		const r = spec.evaluate({ pool });
		expect(r.actual).toBe(28);
		expect(r.contributingCourses).toHaveLength(7);
	});
});
