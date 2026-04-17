import { describe, expect, it } from "vitest";
import { runPipeline } from "../../allocation/pipeline.ts";
import { AcademicRecord } from "../../entities/academic-record.ts";
import { fixtures } from "./fixtures.ts";
import { defaultRuleSet } from "./index.ts";

const runAll = (
	record: ReturnType<(typeof fixtures)[keyof typeof fixtures]>,
) => {
	const passed = AcademicRecord.passedCourses(record);
	const pipeline = runPipeline(passed, defaultRuleSet.requirements);
	const total = defaultRuleSet.totalRequirement.evaluate({ pool: passed });
	const thesis = defaultRuleSet.thesisEligibility.evaluate({ pool: passed });
	return { pipeline, total, thesis };
};

const summarize = (
	outcome: ReturnType<typeof runAll>,
): Record<string, boolean> => {
	const summary: Record<string, boolean> = {};
	for (const step of outcome.pipeline.steps) {
		summary[step.id] = step.result.satisfied;
	}
	summary["total-124"] = outcome.total.satisfied;
	summary["thesis-eligibility"] = outcome.thesis.satisfied;
	return summary;
};

describe("default ruleset — graduatable fixture", () => {
	it("satisfies all top-level requirements and thesis eligibility", () => {
		const record = fixtures.graduatable();
		const outcome = runAll(record);
		expect(summarize(outcome)).toMatchInlineSnapshot(`
			{
			  "elective-38": true,
			  "liberal": true,
			  "platform": true,
			  "primary-12": true,
			  "seminar-12": true,
			  "seminar-34": true,
			  "seminar-56": true,
			  "thesis-eligibility": true,
			  "total-124": true,
			}
		`);
	});
});

describe("default ruleset — insufficientCredits fixture", () => {
	it("fails most requirements due to lack of credits", () => {
		const record = fixtures.insufficientCredits();
		const outcome = runAll(record);
		const s = summarize(outcome);
		expect(s["primary-12"]).toBe(false);
		expect(s["liberal"]).toBe(false);
		expect(s["total-124"]).toBe(false);
		expect(s["thesis-eligibility"]).toBe(false);
	});
});

describe("default ruleset — missingField fixture", () => {
	it("primary and electives may pass but liberal group fails on fields", () => {
		const record = fixtures.missingField();
		const outcome = runAll(record);
		const liberalStep = outcome.pipeline.steps.find((s) => s.id === "liberal");
		expect(liberalStep?.result.satisfied).toBe(false);
		const fieldsSub = liberalStep?.result.subResults.find(
			(r) => r.required === 3 && r.actual <= 3,
		);
		expect(fieldsSub?.satisfied).toBe(false);
	});
});

describe("default ruleset — careerOverflow fixture", () => {
	it("fails liberal requirement when career cap 6 excludes the excess", () => {
		const record = fixtures.careerOverflow();
		const outcome = runAll(record);
		const liberalStep = outcome.pipeline.steps.find((s) => s.id === "liberal");
		expect(liberalStep?.result.satisfied).toBe(false);
		// 12 (field) + 8 (english) + 6 (career capped) = 26 < 28
		expect(liberalStep?.result.actual).toBe(26);
	});
});

describe("default ruleset — seminar34FallMissing fixture", () => {
	it("fails seminar-34 when 演習 I 4 units but 演習 II 0 units", () => {
		const record = fixtures.seminar34FallMissing();
		const outcome = runAll(record);
		const seminar34Step = outcome.pipeline.steps.find(
			(s) => s.id === "seminar-34",
		);
		expect(seminar34Step?.result.satisfied).toBe(false);
		const fallSub = seminar34Step?.result.subResults.find(
			(r) => r.required === 2 && r.actual === 0,
		);
		expect(fallSub).toBeDefined();
		expect(fallSub?.satisfied).toBe(false);
	});
});

describe("default ruleset — seminar56Overflow fixture", () => {
	it("consumes all V-VI courses so the excess does not flow into elective", () => {
		const record = fixtures.seminar56Overflow();
		const outcome = runAll(record);
		const seminar56Step = outcome.pipeline.steps.find(
			(s) => s.id === "seminar-56",
		);
		const electiveStep = outcome.pipeline.steps.find(
			(s) => s.id === "elective-38",
		);
		const seminar56Ids = new Set(seminar56Step?.consumedCourseIds);
		const electiveIds = new Set(
			electiveStep?.result.contributingCourses.map((c) => c.id as string),
		);
		const seminar56CourseIds = record.courses
			.filter((c) => c.category.kind === "seminar/5-6-thesis")
			.map((c) => c.id as string);
		for (const id of seminar56CourseIds) {
			expect(seminar56Ids.has(id)).toBe(true);
			expect(electiveIds.has(id)).toBe(false);
		}
	});
});

describe("default ruleset — thesisBlocked fixture", () => {
	it("main requirements may pass while thesis eligibility fails on language", () => {
		const record = fixtures.thesisBlocked();
		const outcome = runAll(record);
		expect(outcome.thesis.satisfied).toBe(false);
		const languageSub = outcome.thesis.subResults.find(
			(r) => r.actual === 0 && r.required === 1,
		);
		expect(languageSub?.satisfied).toBe(false);
	});
});
