import { describe, expect, it } from "vitest";
import { Course } from "../entities/course.ts";
import { minCredits } from "../specifications/combinators/min-credits.ts";
import { CourseId } from "../value-objects/course-id.ts";
import { Credit } from "../value-objects/credit.ts";
import { Grade } from "../value-objects/grade.ts";
import { SubjectCategory } from "../value-objects/subject-category.ts";
import { runPipeline } from "./pipeline.ts";

const course = (
	id: string,
	credit: number,
	category = SubjectCategory.primary(),
) =>
	Course.of({
		id: CourseId.of(id),
		name: `n-${id}`,
		credit: Credit.of(credit),
		grade: Grade.Yu,
		category,
		rawCategoryLabel: "raw",
	});

const anySpec = (id: string, label: string, required: number) =>
	minCredits({ id, label, required, predicate: () => true });

describe("runPipeline", () => {
	it("consume-required removes exactly up to the required credits", () => {
		const pool = [course("a", 2), course("b", 2), course("c", 4)];
		const step = {
			spec: anySpec("s1", "step 1", 4),
			allocation: "consume-required" as const,
		};
		const out = runPipeline(pool, [step]);
		expect(out.steps).toHaveLength(1);
		expect(out.steps[0]?.consumedCourseIds).toEqual(["a", "b"]);
		expect(out.leftoverPool.map((c) => c.id as string)).toEqual(["c"]);
	});

	it("consume-all removes every contributing course", () => {
		const pool = [course("a", 2), course("b", 4), course("c", 6)];
		const step = {
			spec: anySpec("s1", "step 1", 4),
			allocation: "consume-all" as const,
		};
		const out = runPipeline(pool, [step]);
		expect(out.leftoverPool).toHaveLength(0);
	});

	it("observe does not shrink the pool", () => {
		const pool = [course("a", 2), course("b", 4)];
		const step = {
			spec: anySpec("s1", "step 1", 2),
			allocation: "observe" as const,
		};
		const out = runPipeline(pool, [step]);
		expect(out.leftoverPool).toHaveLength(2);
		expect(out.steps[0]?.consumedCourseIds).toEqual([]);
	});

	it("chains steps, each seeing the shrunken pool", () => {
		const pool = [course("a", 2), course("b", 4), course("c", 6)];
		const step1 = {
			spec: anySpec("s1", "step 1", 4),
			allocation: "consume-required" as const,
		};
		const step2 = {
			spec: anySpec("s2", "step 2", 6),
			allocation: "consume-required" as const,
		};
		const out = runPipeline(pool, [step1, step2]);
		expect(out.steps[0]?.consumedCourseIds).toEqual(["a", "b"]);
		expect(out.steps[1]?.consumedCourseIds).toEqual(["c"]);
		expect(out.leftoverPool).toHaveLength(0);
	});

	it("stops accumulating consumed courses when required is 0", () => {
		const pool = [course("a", 2)];
		const step = {
			spec: anySpec("s1", "step 1", 0),
			allocation: "consume-required" as const,
		};
		const out = runPipeline(pool, [step]);
		expect(out.steps[0]?.consumedCourseIds).toEqual([]);
		expect(out.leftoverPool).toHaveLength(1);
	});

	it("returns empty steps for an empty pipeline", () => {
		const out = runPipeline([course("a", 2)], []);
		expect(out.steps).toEqual([]);
		expect(out.leftoverPool).toHaveLength(1);
	});
});
