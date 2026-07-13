import { describe, expect, it } from "vitest";
import { Course } from "../domain/entities/course.ts";
import { CourseId } from "../domain/value-objects/course-id.ts";
import { Credit } from "../domain/value-objects/credit.ts";
import { Grade } from "../domain/value-objects/grade.ts";
import { SubjectCategory } from "../domain/value-objects/subject-category.ts";
import type {
	Assessment,
	SpecResult,
	StepOutcome,
} from "./assessment-types.ts";
import {
	courseKindDisplayName,
	requirementDisplayName,
	viewCourseAllocations,
} from "./course-allocation-view.ts";

const result = (over: Partial<SpecResult> = {}): SpecResult => ({
	satisfied: true,
	required: 0,
	actual: 0,
	contributingCourses: [],
	subResults: [],
	diagnostics: [],
	...over,
});

const step = (id: string, over: Partial<StepOutcome> = {}): StepOutcome => ({
	id,
	label: id,
	result: result(),
	consumedCourseIds: [],
	...over,
});

const assessment = (steps: readonly StepOutcome[]): Assessment => ({
	steps,
	leftoverCourses: [],
	total: result(),
	thesisEligibility: result(),
	totalCredits: Credit.of(0),
	totalCreditsRequired: 124,
	graduatable: false,
	inProgressCredits: Credit.of(0),
	inProgressCourses: [],
});

const course = (
	id: string,
	category: SubjectCategory,
	grade: Grade = Grade.Yu,
): Course =>
	Course.of({
		id: CourseId.of(id),
		name: id,
		credit: Credit.of(2),
		grade,
		category,
		rawCategoryLabel: "raw",
	});

const idOf = (c: Course): string => c.id as string;

describe("viewCourseAllocations — passed courses", () => {
	it("counts a course under its natural home without reallocation", () => {
		const c = course("P1", SubjectCategory.primary());
		const a = assessment([
			step("primary-12", { consumedCourseIds: [idOf(c)] }),
		]);
		const s = viewCourseAllocations(a, [c], new Set([idOf(c)])).get(
			idOf(c),
		)?.status;
		expect(s?.kind).toBe("counted");
		if (s?.kind === "counted") {
			expect(s.requirementId).toBe("primary-12");
			expect(s.naturalHome).toBe("primary-12");
			expect(s.reallocated).toBe(false);
		}
	});

	it("marks a course reallocated when counted outside its natural home", () => {
		// liberal/career's natural home is "liberal", absent here, so counting it
		// under "platform" is a reallocation.
		const c = course("C1", SubjectCategory.liberalCareer());
		const a = assessment([step("platform", { consumedCourseIds: [idOf(c)] })]);
		const s = viewCourseAllocations(a, [c], new Set([idOf(c)])).get(
			idOf(c),
		)?.status;
		expect(s?.kind).toBe("counted");
		if (s?.kind === "counted") {
			expect(s.requirementId).toBe("platform");
			expect(s.naturalHome).toBe("liberal");
			expect(s.reallocated).toBe(true);
		}
	});

	it("counts an unknown-kind course with a null natural home", () => {
		const c = course("U1", SubjectCategory.unknown("raw"));
		const a = assessment([step("platform", { consumedCourseIds: [idOf(c)] })]);
		const s = viewCourseAllocations(a, [c], new Set([idOf(c)])).get(
			idOf(c),
		)?.status;
		expect(s?.kind).toBe("counted");
		if (s?.kind === "counted") {
			expect(s.naturalHome).toBeNull();
			expect(s.reallocated).toBe(false);
		}
	});

	it("counts a course contributing to the elective step", () => {
		const c = course("E1", SubjectCategory.electiveOwnCourse());
		const a = assessment([
			step("elective-38", { result: result({ contributingCourses: [c] }) }),
		]);
		const s = viewCourseAllocations(a, [c], new Set([idOf(c)])).get(
			idOf(c),
		)?.status;
		expect(s?.kind).toBe("counted");
		if (s?.kind === "counted") {
			expect(s.requirementId).toBe("elective-38");
			expect(s.reallocated).toBe(false);
		}
	});

	it("counts an unknown-kind elective contribution with a null natural home", () => {
		const c = course("E2", SubjectCategory.unknown("raw"));
		const a = assessment([
			step("elective-42", { result: result({ contributingCourses: [c] }) }),
		]);
		const s = viewCourseAllocations(a, [c], new Set([idOf(c)])).get(
			idOf(c),
		)?.status;
		expect(s?.kind).toBe("counted");
		if (s?.kind === "counted") {
			expect(s.requirementId).toBe("elective-42");
			expect(s.naturalHome).toBeNull();
		}
	});

	it("surfaces a course excluded by a cap with its reason", () => {
		const c = course("O1", SubjectCategory.electiveOtherFaculty());
		const a = assessment([
			step("elective-38", {
				result: result({
					excludedCourses: [{ course: c, reason: "16 単位枠超過で算入外" }],
				}),
			}),
		]);
		const s = viewCourseAllocations(a, [c], new Set([idOf(c)])).get(
			idOf(c),
		)?.status;
		expect(s?.kind).toBe("excluded");
		if (s?.kind === "excluded") expect(s.reason).toContain("枠");
	});

	it("marks a passed course picked up by no requirement as unused-overflow", () => {
		const c = course("F1", SubjectCategory.electiveOwnCourse());
		// No elective step exists, so own-course has nowhere to land.
		const a = assessment([step("primary-12")]);
		const s = viewCourseAllocations(a, [c], new Set([idOf(c)])).get(
			idOf(c),
		)?.status;
		expect(s?.kind).toBe("unused-overflow");
	});
});

describe("viewCourseAllocations — courses not counted", () => {
	it("marks courses absent from the passed set as not-passed", () => {
		const c = course("N1", SubjectCategory.primary());
		const a = assessment([step("primary-12")]);
		const s = viewCourseAllocations(a, [c], new Set()).get(idOf(c))?.status;
		expect(s?.kind).toBe("not-passed");
	});

	it("marks in-progress courses as in-progress", () => {
		const c = course("IP1", SubjectCategory.seminar56Thesis(), Grade.Risyuchu);
		const a = assessment([step("seminar-56")]);
		const s = viewCourseAllocations(a, [c], new Set()).get(idOf(c))?.status;
		expect(s?.kind).toBe("in-progress");
		if (s?.kind === "in-progress") expect(s.naturalHome).toBe("seminar-56");
	});
});

describe("requirementDisplayName", () => {
	it("returns human-readable labels for known requirement ids", () => {
		expect(requirementDisplayName("primary-12")).toBe("初年次科目");
		expect(requirementDisplayName("liberal")).toBe("教養科目");
		expect(requirementDisplayName("introductory-group")).toBe("導入科目群");
		expect(requirementDisplayName("liberal-group")).toBe("教養科目群");
		expect(requirementDisplayName("seminar-12")).toBe("ゼミナール I・II");
		expect(requirementDisplayName("seminar-34")).toBe("ゼミナール III・IV");
		expect(requirementDisplayName("seminar-56")).toBe(
			"卒業論文・ゼミナール V・VI",
		);
		expect(requirementDisplayName("platform")).toBe("プラットフォーム科目");
		expect(requirementDisplayName("elective-38")).toBe("選択科目");
		expect(requirementDisplayName("elective-42")).toBe("選択科目");
		expect(requirementDisplayName("total-124")).toBe("総修得単位");
		expect(requirementDisplayName("thesis-eligibility")).toBe(
			"卒業論文履修資格",
		);
	});

	it("falls back to the raw id for unknown requirement ids", () => {
		expect(requirementDisplayName("some-custom-id")).toBe("some-custom-id");
	});
});

describe("courseKindDisplayName", () => {
	it("returns human-readable label for a kind", () => {
		expect(courseKindDisplayName("elective/other-faculty")).toBe("他学部専門");
	});
});
