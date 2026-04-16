import { describe, expect, it } from "vitest";
import { ErrorCode } from "../errors/error-code.ts";
import { hasCode } from "../errors/guards.ts";
import { Credit } from "./credit.ts";
import { GPA, GradePoint } from "./gpa.ts";

describe("GradePoint.ofScore", () => {
	it.each([
		[100, 4.5],
		[90, 3.5],
		[85, 3.0],
		[80, 2.5],
		[75, 2.0],
		[70, 1.5],
		[65, 1.0],
		[60, 0.5],
		[59, 0],
		[30, 0],
		[0, 0],
	])("score %d → GP %d", (score, expected) => {
		expect(GradePoint.toNumber(GradePoint.ofScore(score))).toBe(expected);
	});

	it("rounds to 1 decimal place", () => {
		expect(GradePoint.toNumber(GradePoint.ofScore(63))).toBe(0.8);
		expect(GradePoint.toNumber(GradePoint.ofScore(67))).toBe(1.2);
	});

	it.each([
		Number.NaN,
		Number.POSITIVE_INFINITY,
		-1,
		101,
	])("rejects invalid score %o with GpaInvalidScore", (bad) => {
		try {
			GradePoint.ofScore(bad);
			expect.unreachable("should have thrown");
		} catch (e) {
			expect(hasCode(e, ErrorCode.GpaInvalidScore)).toBe(true);
		}
	});

	it("has a zero constant", () => {
		expect(GradePoint.toNumber(GradePoint.zero)).toBe(0);
	});
});

describe("GPA.weightedAverage", () => {
	it("returns 0 for empty list", () => {
		expect(GPA.toNumber(GPA.weightedAverage([]))).toBe(0);
	});

	it("returns 0 when total credits are 0", () => {
		const entry = {
			gradePoint: GradePoint.ofScore(80),
			credit: Credit.zero,
		};
		expect(GPA.toNumber(GPA.weightedAverage([entry]))).toBe(0);
	});

	it("computes weighted average rounded to 1 decimal", () => {
		// 2 credits @ GP 2.5 (80 pt), 2 credits @ GP 3.5 (90 pt)
		// average = (2*2.5 + 2*3.5) / 4 = 12/4 = 3.0
		const result = GPA.weightedAverage([
			{ gradePoint: GradePoint.ofScore(80), credit: Credit.of(2) },
			{ gradePoint: GradePoint.ofScore(90), credit: Credit.of(2) },
		]);
		expect(GPA.toNumber(result)).toBe(3.0);
	});

	it("weights higher-credit courses more", () => {
		// 4 credits @ 80 (GP 2.5), 1 credit @ 60 (GP 0.5)
		// average = (4*2.5 + 1*0.5) / 5 = 10.5 / 5 = 2.1
		const result = GPA.weightedAverage([
			{ gradePoint: GradePoint.ofScore(80), credit: Credit.of(4) },
			{ gradePoint: GradePoint.ofScore(60), credit: Credit.of(1) },
		]);
		expect(GPA.toNumber(result)).toBe(2.1);
	});

	it("includes failing GPs (0) in the divisor", () => {
		// 2 credits @ 80 (2.5), 2 credits @ 40 (0)
		// average = (2*2.5 + 2*0) / 4 = 1.25
		const result = GPA.weightedAverage([
			{ gradePoint: GradePoint.ofScore(80), credit: Credit.of(2) },
			{ gradePoint: GradePoint.ofScore(40), credit: Credit.of(2) },
		]);
		expect(GPA.toNumber(result)).toBe(1.3);
	});
});
