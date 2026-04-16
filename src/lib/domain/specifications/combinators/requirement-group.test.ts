import { describe, expect, it } from "vitest";
import { Course } from "../../entities/course.ts";
import { CourseId } from "../../value-objects/course-id.ts";
import { Credit } from "../../value-objects/credit.ts";
import { Grade } from "../../value-objects/grade.ts";
import { SubjectCategory } from "../../value-objects/subject-category.ts";
import { minCredits } from "./min-credits.ts";
import { requirementGroup } from "./requirement-group.ts";

const course = (id: string, credit: number) =>
	Course.of({
		id: CourseId.of(id),
		name: `n-${id}`,
		credit: Credit.of(credit),
		grade: Grade.Yu,
		category: SubjectCategory.primary(),
		rawCategoryLabel: "raw",
	});

describe("requirementGroup", () => {
	const primary = minCredits({
		id: "p",
		label: "Primary",
		required: 6,
		predicate: () => true,
	});
	const sub = minCredits({
		id: "sub",
		label: "Sub",
		required: 2,
		predicate: () => true,
	});

	it("uses the primary's required/actual/contributingCourses", () => {
		const spec = requirementGroup({
			id: "g",
			label: "Group",
			primary,
			subSpecs: [sub],
		});
		const pool = [course("x", 6)];
		const r = spec.evaluate({ pool });
		expect(r.required).toBe(6);
		expect(r.actual).toBe(6);
		expect(r.contributingCourses).toHaveLength(1);
		expect(r.subResults).toHaveLength(2);
	});

	it("is satisfied only when primary AND all sub-specs are satisfied", () => {
		const highSub = minCredits({
			id: "high",
			label: "High",
			required: 100,
			predicate: () => true,
		});
		const spec = requirementGroup({
			id: "g",
			label: "Group",
			primary,
			subSpecs: [highSub],
		});
		const pool = [course("x", 6)];
		expect(spec.evaluate({ pool }).satisfied).toBe(false);
	});

	it("works with no sub-specs", () => {
		const spec = requirementGroup({
			id: "g",
			label: "Group",
			primary,
			subSpecs: [],
		});
		const pool = [course("x", 6)];
		const r = spec.evaluate({ pool });
		expect(r.satisfied).toBe(true);
		expect(r.subResults).toHaveLength(1);
	});
});
