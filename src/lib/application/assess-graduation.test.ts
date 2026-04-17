import { describe, expect, it } from "vitest";
import { AcademicRecord } from "../domain/entities/academic-record.ts";
import { Course } from "../domain/entities/course.ts";
import { fixtures } from "../domain/rulesets/default/fixtures.ts";
import { defaultRuleSet } from "../domain/rulesets/default/index.ts";
import { CourseId } from "../domain/value-objects/course-id.ts";
import { Credit } from "../domain/value-objects/credit.ts";
import { Grade } from "../domain/value-objects/grade.ts";
import { SubjectCategory } from "../domain/value-objects/subject-category.ts";
import { assessGraduation } from "./assess-graduation.ts";

describe("assessGraduation", () => {
	it("returns graduatable=true for a well-formed fixture", () => {
		const record = fixtures.graduatable();
		const assessment = assessGraduation(record, defaultRuleSet);
		expect(assessment.graduatable).toBe(true);
		expect(assessment.total.satisfied).toBe(true);
		expect(assessment.thesisEligibility.satisfied).toBe(true);
		expect(assessment.totalCreditsRequired).toBe(124);
	});

	it("returns graduatable=false for insufficient credits", () => {
		const record = fixtures.insufficientCredits();
		const assessment = assessGraduation(record, defaultRuleSet);
		expect(assessment.graduatable).toBe(false);
		expect(assessment.total.satisfied).toBe(false);
	});

	it("returns graduatable=false when a requirement (fields) is missing", () => {
		const record = fixtures.missingField();
		const assessment = assessGraduation(record, defaultRuleSet);
		expect(assessment.graduatable).toBe(false);
	});

	it("reports leftover courses after pipeline consumption", () => {
		const record = fixtures.graduatable();
		const assessment = assessGraduation(record, defaultRuleSet);
		expect(Array.isArray(assessment.leftoverCourses)).toBe(true);
	});

	it("omits tentative when no in-progress courses exist", () => {
		const record = fixtures.graduatable();
		const assessment = assessGraduation(record, defaultRuleSet);
		expect(assessment.inProgressCourses).toHaveLength(0);
		expect(Credit.toNumber(assessment.inProgressCredits)).toBe(0);
		expect(assessment.tentative).toBeUndefined();
	});

	it("produces tentative assessment when in-progress courses exist", () => {
		// 履修中の卒論 8 単位だけが不足 → 現時点 graduatable=false,
		// tentative.graduatable は seminar-56 が満たされることで true になりうる
		const insufficient = fixtures.insufficientCredits();
		const inProgress = Course.of({
			id: CourseId.of("IP-THESIS"),
			name: "卒業論文（履修中）",
			credit: Credit.of(8),
			grade: Grade.Risyuchu,
			category: SubjectCategory.seminar56Thesis(),
			rawCategoryLabel: "卒業論文",
		});
		const record = AcademicRecord.of(insufficient.profile, [
			...insufficient.courses,
			inProgress,
		]);
		const assessment = assessGraduation(record, defaultRuleSet);
		expect(assessment.inProgressCourses).toHaveLength(1);
		expect(Credit.toNumber(assessment.inProgressCredits)).toBe(8);
		expect(assessment.graduatable).toBe(false);
		expect(assessment.tentative).toBeDefined();
		if (assessment.tentative !== undefined) {
			const seminar56 = assessment.tentative.steps.find(
				(s) => s.id === "seminar-56",
			);
			expect(seminar56?.result.satisfied).toBe(true);
		}
	});
});
