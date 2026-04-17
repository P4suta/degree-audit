import { describe, expect, it } from "vitest";
import { Course } from "../../entities/course.ts";
import { CourseId } from "../../value-objects/course-id.ts";
import { Credit } from "../../value-objects/credit.ts";
import { Grade } from "../../value-objects/grade.ts";
import {
	SubjectCategory as SC,
	type SubjectCategory,
	type SubjectCategoryKind,
} from "../../value-objects/subject-category.ts";
import { minKindsCovered } from "./min-kinds-covered.ts";

const SEVEN_KINDS: readonly SubjectCategoryKind[] = [
	"common-education/liberal-group/life",
	"common-education/liberal-group/health-sports",
	"common-education/liberal-group/career",
	"common-education/liberal-group/arts",
	"common-education/liberal-group/humanities-social",
	"common-education/liberal-group/natural-science",
	"common-education/liberal-group/complex",
];

let counter = 0;
const mk = (credit: number, category: SubjectCategory): Course => {
	counter += 1;
	return Course.of({
		id: CourseId.of(`T${counter.toString().padStart(3, "0")}`),
		name: `test-${counter}`,
		credit: Credit.of(credit),
		grade: Grade.Yu,
		category,
		rawCategoryLabel: "raw",
	});
};

describe("minKindsCovered", () => {
	it("satisfies when ≥ requiredKindCount fields are covered and total ≥ totalMinCredits", () => {
		const spec = minKindsCovered({
			id: "liberal-7",
			label: "教養 7分野のうち 3分野以上 / 合計 8 単位以上",
			kinds: SEVEN_KINDS,
			requiredCreditsPerKind: 1,
			requiredKindCount: 3,
			totalMinCredits: 8,
		});
		const pool = [
			mk(2, SC.liberalGroupLife()),
			mk(2, SC.liberalGroupArts()),
			mk(4, SC.liberalGroupComplex()),
		];
		const r = spec.evaluate({ pool });
		expect(r.satisfied).toBe(true);
		expect(r.actual).toBe(3);
		expect(r.required).toBe(3);
		expect(r.unit).toBe("分野");
	});

	it("unsatisfied when kind count short", () => {
		const spec = minKindsCovered({
			id: "liberal-7",
			label: "test",
			kinds: SEVEN_KINDS,
			requiredCreditsPerKind: 1,
			requiredKindCount: 3,
		});
		const pool = [mk(4, SC.liberalGroupLife()), mk(4, SC.liberalGroupArts())];
		const r = spec.evaluate({ pool });
		expect(r.satisfied).toBe(false);
		expect(r.actual).toBe(2);
	});

	it("unsatisfied when total credits below threshold even with enough kinds", () => {
		const spec = minKindsCovered({
			id: "liberal-7",
			label: "test",
			kinds: SEVEN_KINDS,
			requiredCreditsPerKind: 1,
			requiredKindCount: 3,
			totalMinCredits: 8,
		});
		const pool = [
			mk(1, SC.liberalGroupLife()),
			mk(1, SC.liberalGroupArts()),
			mk(1, SC.liberalGroupComplex()),
		];
		const r = spec.evaluate({ pool });
		// 3 分野は充足するが合計 3 < 8
		expect(r.satisfied).toBe(false);
	});

	it("ignores courses outside the allowed kinds", () => {
		const spec = minKindsCovered({
			id: "liberal-7",
			label: "test",
			kinds: SEVEN_KINDS,
			requiredCreditsPerKind: 1,
			requiredKindCount: 1,
		});
		const pool = [mk(4, SC.primary()), mk(2, SC.liberalGroupLife())];
		const r = spec.evaluate({ pool });
		expect(r.contributingCourses.length).toBe(1);
		expect(r.actual).toBe(1);
		expect(r.satisfied).toBe(true);
	});

	it("requires ≥ requiredCreditsPerKind per kind", () => {
		const spec = minKindsCovered({
			id: "liberal-7",
			label: "test",
			kinds: SEVEN_KINDS,
			requiredCreditsPerKind: 2, // 2 単位以上で初めてカバー扱い
			requiredKindCount: 2,
		});
		const pool = [
			mk(1, SC.liberalGroupLife()), // < 2 → カバー外
			mk(2, SC.liberalGroupArts()), // ok
			mk(2, SC.liberalGroupComplex()), // ok
		];
		const r = spec.evaluate({ pool });
		expect(r.actual).toBe(2);
		expect(r.satisfied).toBe(true);
	});

	it("omits totalMinCredits check when not given", () => {
		const spec = minKindsCovered({
			id: "liberal-7",
			label: "test",
			kinds: SEVEN_KINDS,
			requiredCreditsPerKind: 1,
			requiredKindCount: 1,
		});
		const r = spec.evaluate({ pool: [mk(1, SC.liberalGroupLife())] });
		expect(r.satisfied).toBe(true);
		expect(r.diagnostics.some((d) => d.includes("合計"))).toBe(false);
	});
});
