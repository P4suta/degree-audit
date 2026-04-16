import { describe, expect, it } from "vitest";
import { fixtures } from "../domain/rulesets/default/fixtures.ts";
import { defaultRuleSet } from "../domain/rulesets/default/index.ts";
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
});
