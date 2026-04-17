import { describe, expect, it } from "vitest";
import { Course } from "../entities/course.ts";
import { CourseId } from "../value-objects/course-id.ts";
import { Credit } from "../value-objects/credit.ts";
import { FieldCategory } from "../value-objects/field-category.ts";
import { Grade } from "../value-objects/grade.ts";
import { SubjectCategory } from "../value-objects/subject-category.ts";
import { allOf } from "./combinators/all-of.ts";
import { anyOf } from "./combinators/any-of.ts";
import { cappedContribution } from "./combinators/capped-contribution.ts";
import { minCredits } from "./combinators/min-credits.ts";
import { minCreditsInCategory } from "./combinators/min-credits-in-category.ts";
import { minFieldsCovered } from "./combinators/min-fields-covered.ts";
import { perLanguageMin } from "./combinators/per-language-min.ts";
import { totalCredits } from "./types.ts";

const course = (
	idText: string,
	credit: number,
	category: SubjectCategory,
	options: { grade?: Grade } = {},
): Course =>
	Course.of({
		id: CourseId.of(idText),
		name: `n-${idText}`,
		credit: Credit.of(credit),
		grade: options.grade ?? Grade.Yu,
		category,
		rawCategoryLabel: "raw",
	});

const ctx = (pool: readonly Course[]) => ({ pool });

describe("totalCredits", () => {
	it("sums credit values as raw numbers", () => {
		const courses = [
			course("a", 2, SubjectCategory.primary()),
			course("b", 4, SubjectCategory.primary()),
		];
		expect(totalCredits(courses)).toBe(6);
	});
	it("returns 0 for empty array", () => {
		expect(totalCredits([])).toBe(0);
	});
});

describe("minCredits", () => {
	const spec = minCredits({
		id: "primary",
		label: "初年次科目",
		required: 12,
		predicate: (c) => c.category.kind === "common-education/primary",
	});

	it("satisfies when actual >= required", () => {
		const pool = [
			course("a", 6, SubjectCategory.primary()),
			course("b", 6, SubjectCategory.primary()),
			course("c", 4, SubjectCategory.platformBasicA()),
		];
		const r = spec.evaluate(ctx(pool));
		expect(r.satisfied).toBe(true);
		expect(r.required).toBe(12);
		expect(r.actual).toBe(12);
		expect(r.contributingCourses).toHaveLength(2);
		expect(r.diagnostics.at(0)).toMatch(/満たしています/);
	});

	it("not satisfied when actual < required", () => {
		const pool = [course("a", 6, SubjectCategory.primary())];
		const r = spec.evaluate(ctx(pool));
		expect(r.satisfied).toBe(false);
		expect(r.actual).toBe(6);
		expect(r.diagnostics.at(0)).toMatch(/あと 6/);
	});
});

describe("minCreditsInCategory", () => {
	it("filters to the allowed kinds", () => {
		const spec = minCreditsInCategory({
			id: "seminar-all",
			label: "ゼミ全部",
			required: 8,
			kinds: ["seminar/1-2", "seminar/3-4/spring", "seminar/3-4/fall"],
		});
		const pool = [
			course("s1", 4, SubjectCategory.seminar12()),
			course("s2", 2, SubjectCategory.seminar34Spring()),
			course("s4", 2, SubjectCategory.seminar34Fall()),
			course("s3", 4, SubjectCategory.seminar56Thesis()),
		];
		const r = spec.evaluate(ctx(pool));
		expect(r.actual).toBe(8);
		expect(r.contributingCourses).toHaveLength(3);
	});
});

describe("allOf", () => {
	it("is satisfied only when every sub-spec is satisfied", () => {
		const a = minCredits({
			id: "a",
			label: "A",
			required: 2,
			predicate: () => true,
		});
		const b = minCredits({
			id: "b",
			label: "B",
			required: 10,
			predicate: () => true,
		});
		const spec = allOf({ id: "all", label: "all", specs: [a, b] });
		const pool = [course("x", 4, SubjectCategory.primary())];
		const r = spec.evaluate(ctx(pool));
		expect(r.satisfied).toBe(false);
		expect(r.subResults).toHaveLength(2);
		// allOf は要件件数ベース: 2 sub-spec のうち 1 件（a）だけ充足
		expect(r.required).toBe(2);
		expect(r.actual).toBe(1);
		expect(r.unit).toBe("要件");
		expect(r.contributingCourses).toHaveLength(1);
	});

	it("unions contributing courses uniquely", () => {
		const a = minCredits({
			id: "a",
			label: "A",
			required: 1,
			predicate: () => true,
		});
		const b = minCredits({
			id: "b",
			label: "B",
			required: 1,
			predicate: () => true,
		});
		const spec = allOf({ id: "all", label: "all", specs: [a, b] });
		const pool = [course("x", 2, SubjectCategory.primary())];
		const r = spec.evaluate(ctx(pool));
		expect(r.contributingCourses).toHaveLength(1);
	});

	it("returns no contributing courses on an empty spec list", () => {
		const spec = allOf({ id: "empty", label: "empty", specs: [] });
		const r = spec.evaluate(ctx([]));
		expect(r.satisfied).toBe(true);
		expect(r.required).toBe(0);
		expect(r.actual).toBe(0);
	});
});

describe("anyOf", () => {
	it("is satisfied when any sub-spec is satisfied", () => {
		const a = minCredits({
			id: "a",
			label: "A",
			required: 100,
			predicate: () => true,
		});
		const b = minCredits({
			id: "b",
			label: "B",
			required: 1,
			predicate: () => true,
		});
		const spec = anyOf({ id: "any", label: "any", specs: [a, b] });
		const pool = [course("x", 2, SubjectCategory.primary())];
		expect(spec.evaluate(ctx(pool)).satisfied).toBe(true);
	});

	it("reports required/actual as the max of sub-specs and fails when none satisfied", () => {
		const a = minCredits({
			id: "a",
			label: "A",
			required: 5,
			predicate: () => true,
		});
		const b = minCredits({
			id: "b",
			label: "B",
			required: 10,
			predicate: () => true,
		});
		const spec = anyOf({ id: "any", label: "any", specs: [a, b] });
		const pool = [course("x", 4, SubjectCategory.primary())];
		const r = spec.evaluate(ctx(pool));
		expect(r.required).toBe(10);
		expect(r.actual).toBe(4);
		expect(r.satisfied).toBe(false);
	});

	it("handles an empty spec list gracefully", () => {
		const spec = anyOf({ id: "empty", label: "empty", specs: [] });
		const r = spec.evaluate(ctx([]));
		expect(r.satisfied).toBe(false);
		expect(r.required).toBe(0);
		expect(r.actual).toBe(0);
	});
});

describe("minFieldsCovered", () => {
	const spec = minFieldsCovered({
		id: "fields",
		label: "分野",
		requiredCreditsPerField: 1,
		requiredFieldCount: 3,
	});

	it("counts distinct fields with >= required credits", () => {
		const pool = [
			course("h", 2, SubjectCategory.liberalField(FieldCategory.Humanities)),
			course("s", 2, SubjectCategory.liberalField(FieldCategory.Social)),
			course("n", 2, SubjectCategory.liberalField(FieldCategory.Natural)),
		];
		const r = spec.evaluate(ctx(pool));
		expect(r.satisfied).toBe(true);
		expect(r.actual).toBe(3);
		expect(r.required).toBe(3);
		expect(r.contributingCourses).toHaveLength(3);
	});

	it("fails when too few fields are covered", () => {
		const pool = [
			course("h", 2, SubjectCategory.liberalField(FieldCategory.Humanities)),
			course("s", 2, SubjectCategory.liberalField(FieldCategory.Social)),
		];
		const r = spec.evaluate(ctx(pool));
		expect(r.satisfied).toBe(false);
		expect(r.actual).toBe(2);
	});

	it("ignores courses not in liberal/field kinds", () => {
		const pool = [course("x", 10, SubjectCategory.primary())];
		const r = spec.evaluate(ctx(pool));
		expect(r.satisfied).toBe(false);
		expect(r.actual).toBe(0);
		expect(r.contributingCourses).toHaveLength(0);
	});

	it("threshold per field matters", () => {
		const strict = minFieldsCovered({
			id: "fields-strict",
			label: "分野-厳",
			requiredCreditsPerField: 4,
			requiredFieldCount: 3,
		});
		const pool = [
			course("h", 2, SubjectCategory.liberalField(FieldCategory.Humanities)),
			course("s", 4, SubjectCategory.liberalField(FieldCategory.Social)),
			course("b", 4, SubjectCategory.liberalField(FieldCategory.BioMedical)),
			course("n", 4, SubjectCategory.liberalField(FieldCategory.Natural)),
		];
		const r = strict.evaluate(ctx(pool));
		expect(r.actual).toBe(3);
		expect(r.satisfied).toBe(true);
	});
});

describe("perLanguageMin", () => {
	const spec = perLanguageMin({
		id: "lang",
		label: "外国語",
		requiredPerLanguage: 4,
		requiredLanguageCount: 1,
	});

	it("counts languages meeting the per-language threshold", () => {
		const pool = [
			course("e1", 2, SubjectCategory.liberalForeignLanguage("英語")),
			course("e2", 2, SubjectCategory.liberalForeignLanguage("英語")),
			course("f1", 2, SubjectCategory.liberalForeignLanguage("仏語")),
		];
		const r = spec.evaluate(ctx(pool));
		expect(r.actual).toBe(1);
		expect(r.satisfied).toBe(true);
	});

	it("fails when no language reaches the threshold", () => {
		const pool = [
			course("e1", 2, SubjectCategory.liberalForeignLanguage("英語")),
			course("f1", 2, SubjectCategory.liberalForeignLanguage("仏語")),
		];
		const r = spec.evaluate(ctx(pool));
		expect(r.actual).toBe(0);
		expect(r.satisfied).toBe(false);
	});

	it("ignores non-language courses", () => {
		const pool = [course("p", 4, SubjectCategory.primary())];
		const r = spec.evaluate(ctx(pool));
		expect(r.actual).toBe(0);
	});
});

describe("cappedContribution", () => {
	const spec = cappedContribution({
		id: "career",
		label: "キャリア上限",
		cap: 6,
		predicate: (c) => c.category.kind === "common-education/liberal/career",
	});

	it("counts up to the cap and reports excess in diagnostics", () => {
		const pool = [
			course("c1", 2, SubjectCategory.liberalCareer()),
			course("c2", 2, SubjectCategory.liberalCareer()),
			course("c3", 2, SubjectCategory.liberalCareer()),
			course("c4", 2, SubjectCategory.liberalCareer()),
		];
		const r = spec.evaluate(ctx(pool));
		expect(r.actual).toBe(6);
		expect(r.required).toBe(6);
		expect(r.contributingCourses).toHaveLength(3);
		expect(r.diagnostics.some((d) => d.includes("上限超過"))).toBe(true);
	});

	it("emits no overflow diagnostic when under the cap", () => {
		const pool = [course("c1", 2, SubjectCategory.liberalCareer())];
		const r = spec.evaluate(ctx(pool));
		expect(r.actual).toBe(2);
		expect(r.diagnostics.some((d) => d.includes("上限超過"))).toBe(false);
	});

	it("stops early when the next course would exceed the cap", () => {
		const pool = [
			course("c1", 4, SubjectCategory.liberalCareer()),
			course("c2", 4, SubjectCategory.liberalCareer()),
		];
		const r = spec.evaluate(ctx(pool));
		expect(r.actual).toBe(4);
		expect(r.contributingCourses).toHaveLength(1);
	});

	it("is always satisfied (it's a cap, not a minimum)", () => {
		const r = spec.evaluate(ctx([]));
		expect(r.satisfied).toBe(true);
	});
});
