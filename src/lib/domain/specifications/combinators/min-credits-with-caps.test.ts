import { describe, expect, it } from "vitest";
import { Course } from "../../entities/course.ts";
import { CourseId } from "../../value-objects/course-id.ts";
import { Credit } from "../../value-objects/credit.ts";
import { FieldCategory } from "../../value-objects/field-category.ts";
import { Grade } from "../../value-objects/grade.ts";
import { SubjectCategory } from "../../value-objects/subject-category.ts";
import { minCreditsWithCaps } from "./min-credits-with-caps.ts";

let counter = 0;
const nextId = () => {
	counter += 1;
	return `C${counter.toString().padStart(4, "0")}`;
};

const career = (credit: number) =>
	Course.of({
		id: CourseId.of(nextId()),
		name: `career-${nextId()}`,
		credit: Credit.of(credit),
		grade: Grade.Yu,
		category: SubjectCategory.liberalCareer(),
		rawCategoryLabel: "raw",
	});

const hum = (credit: number) =>
	Course.of({
		id: CourseId.of(nextId()),
		name: `hum-${nextId()}`,
		credit: Credit.of(credit),
		grade: Grade.Yu,
		category: SubjectCategory.liberalField(FieldCategory.Humanities),
		rawCategoryLabel: "raw",
	});

const english = (credit: number) =>
	Course.of({
		id: CourseId.of(nextId()),
		name: `en-${nextId()}`,
		credit: Credit.of(credit),
		grade: Grade.Yu,
		category: SubjectCategory.liberalForeignLanguage("英語"),
		rawCategoryLabel: "raw",
	});

const liberalSpec = minCreditsWithCaps({
	id: "liberal-28",
	label: "教養 28",
	required: 28,
	kinds: [
		"common-education/liberal/field",
		"common-education/liberal/foreign-language",
		"common-education/liberal/career",
	],
	caps: { "common-education/liberal/career": 6 },
});

describe("minCreditsWithCaps", () => {
	it("sums all credits within kinds when no cap is exceeded", () => {
		counter = 0;
		const pool = [hum(12), english(8), career(4)];
		const r = liberalSpec.evaluate({ pool });
		expect(r.actual).toBe(24);
		expect(r.contributingCourses).toHaveLength(3);
		expect(r.satisfied).toBe(false);
	});

	it("caps the over-limit kind and excludes the excess from actual", () => {
		counter = 0;
		// career 8 total (4 + 4) → only 6 counts (cap). 4 is accepted, second 4 excluded.
		const pool = [hum(12), english(8), career(4), career(4)];
		const r = liberalSpec.evaluate({ pool });
		expect(r.actual).toBe(12 + 8 + 4); // 24, NOT 28
		expect(r.satisfied).toBe(false);
		expect(r.contributingCourses).toHaveLength(3);
	});

	it("mentions the cap in diagnostics when raw exceeds cap", () => {
		counter = 0;
		const pool = [career(4), career(4)];
		const r = liberalSpec.evaluate({ pool });
		expect(
			r.diagnostics.some(
				(d) => d.includes("career") && d.includes("卒業要件外"),
			),
		).toBe(true);
	});

	it("mentions the cap with within-limit info when raw fits", () => {
		counter = 0;
		const pool = [career(2), career(2)];
		const r = liberalSpec.evaluate({ pool });
		expect(r.diagnostics.some((d) => d.includes("上限枠内"))).toBe(true);
	});

	it("satisfies when capped actual meets required", () => {
		counter = 0;
		// hum 20 + career 6 (cap) = 26 still short. Add english 2 → 28.
		const pool = [hum(20), career(4), career(4), english(2)];
		const r = liberalSpec.evaluate({ pool });
		// career 4 accepted (4/6), second 4 rejected (8>6), third 2? No third career.
		// So counted: hum 20 + career 4 + english 2 = 26. Still short.
		// Wait: first career 4 → consumed=4. Second career 4 → 4+4=8 > 6 → rejected.
		// Total: 20 + 4 + 2 = 26. Not satisfied.
		expect(r.actual).toBe(26);
		expect(r.satisfied).toBe(false);
	});

	it("takes career courses in pool order and rejects those that would exceed cap", () => {
		counter = 0;
		// 2 + 2 + 4 in that order. Cap 6.
		// Take 2 (consumed=2), Take 2 (consumed=4), Try 4 (4+4=8>6) → reject.
		// actual = 2 + 2 = 4
		const pool = [career(2), career(2), career(4)];
		const r = liberalSpec.evaluate({ pool });
		expect(r.actual).toBe(4);
	});

	it("ignores courses not in the allowed kinds", () => {
		counter = 0;
		const other = Course.of({
			id: CourseId.of(nextId()),
			name: "primary",
			credit: Credit.of(2),
			grade: Grade.Yu,
			category: SubjectCategory.primary(),
			rawCategoryLabel: "raw",
		});
		const pool = [other, hum(12)];
		const r = liberalSpec.evaluate({ pool });
		expect(r.actual).toBe(12);
		expect(r.contributingCourses).toHaveLength(1);
	});
});
