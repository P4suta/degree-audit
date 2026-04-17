import { describe, expect, it } from "vitest";
import { assessGraduation } from "../../../application/assess-graduation.ts";
import { fixtures } from "./fixtures.ts";
import { r6HumanitiesRuleSet } from "./index.ts";

describe("r6-humanities ruleset — graduatable fixture", () => {
	it("returns graduatable=true with total ≥ 124", () => {
		const a = assessGraduation(fixtures.graduatable(), r6HumanitiesRuleSet);
		expect(a.graduatable).toBe(true);
		expect(a.total.satisfied).toBe(true);
		expect(a.totalCreditsRequired).toBe(124);
	});

	it("satisfies thesis eligibility", () => {
		const a = assessGraduation(fixtures.graduatable(), r6HumanitiesRuleSet);
		expect(a.thesisEligibility.satisfied).toBe(true);
	});

	it("satisfies all pipeline steps", () => {
		const a = assessGraduation(fixtures.graduatable(), r6HumanitiesRuleSet);
		for (const s of a.steps) {
			expect(s.result.satisfied, `${s.label} should be satisfied`).toBe(true);
		}
	});

	it("elective is 42 single in R6+", () => {
		const a = assessGraduation(fixtures.graduatable(), r6HumanitiesRuleSet);
		const elective = a.steps.find((s) => s.id === "elective-42");
		expect(elective?.result.required).toBe(42);
		expect(elective?.result.satisfied).toBe(true);
	});

	it("introductory group (導入) is 10 in R6+", () => {
		const a = assessGraduation(fixtures.graduatable(), r6HumanitiesRuleSet);
		const intro = a.steps.find((s) => s.id === "introductory-group");
		expect(intro?.result.required).toBe(10);
	});

	it("liberal-group is 26 in R6+", () => {
		const a = assessGraduation(fixtures.graduatable(), r6HumanitiesRuleSet);
		const liberal = a.steps.find((s) => s.id === "liberal-group");
		expect(liberal?.result.required).toBe(26);
	});
});

describe("r6-humanities ruleset — insufficient fixture", () => {
	it("graduatable=false when liberal short", () => {
		const a = assessGraduation(fixtures.insufficient(), r6HumanitiesRuleSet);
		expect(a.graduatable).toBe(false);
	});
});
