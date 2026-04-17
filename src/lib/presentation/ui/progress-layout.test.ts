import { describe, expect, it } from "vitest";
import {
	computeProgressLayout,
	resolveProgressState,
} from "./progress-layout.ts";

describe("computeProgressLayout", () => {
	it("returns zeros when required is 0", () => {
		expect(computeProgressLayout({ actual: 0, required: 0 })).toEqual({
			completedPct: 0,
			tentativePct: 0,
			hasInProgress: false,
			tentativeActualOrActual: 0,
		});
	});

	it("returns zeros and keeps actual when required is 0 but actual positive", () => {
		expect(computeProgressLayout({ actual: 5, required: 0 })).toEqual({
			completedPct: 0,
			tentativePct: 0,
			hasInProgress: false,
			tentativeActualOrActual: 5,
		});
	});

	it("computes completed percentage without tentative", () => {
		const out = computeProgressLayout({ actual: 6, required: 12 });
		expect(out.completedPct).toBe(50);
		expect(out.tentativePct).toBe(50);
		expect(out.hasInProgress).toBe(false);
	});

	it("computes stacked layout when tentative exceeds actual", () => {
		const out = computeProgressLayout({
			actual: 2,
			tentativeActual: 10,
			required: 12,
		});
		expect(out.completedPct).toBeCloseTo((2 / 12) * 100);
		expect(out.tentativePct).toBeCloseTo((10 / 12) * 100);
		expect(out.hasInProgress).toBe(true);
	});

	it("caps actual and tentative at required", () => {
		const out = computeProgressLayout({
			actual: 20,
			tentativeActual: 30,
			required: 12,
		});
		expect(out.completedPct).toBe(100);
		expect(out.tentativePct).toBe(100);
		expect(out.hasInProgress).toBe(false);
	});

	it("treats tentative < actual as tentative = actual (no underflow)", () => {
		const out = computeProgressLayout({
			actual: 8,
			tentativeActual: 3,
			required: 12,
		});
		// tentative は actual に張り付く
		expect(out.tentativeActualOrActual).toBe(8);
		expect(out.tentativePct).toBeCloseTo(out.completedPct);
		expect(out.hasInProgress).toBe(false);
	});

	it("clamps negative actual to 0", () => {
		const out = computeProgressLayout({ actual: -5, required: 12 });
		expect(out.completedPct).toBe(0);
	});

	it("reports hasInProgress=false when tentative equals actual", () => {
		const out = computeProgressLayout({
			actual: 4,
			tentativeActual: 4,
			required: 12,
		});
		expect(out.hasInProgress).toBe(false);
	});
});

describe("resolveProgressState", () => {
	it("returns 'satisfied' when current is satisfied", () => {
		expect(
			resolveProgressState({ satisfied: true, tentativeSatisfied: false }),
		).toBe("satisfied");
	});

	it("returns 'satisfied' even if tentative is also true", () => {
		expect(
			resolveProgressState({ satisfied: true, tentativeSatisfied: true }),
		).toBe("satisfied");
	});

	it("returns 'in-progress' when current unsatisfied but tentative satisfied", () => {
		expect(
			resolveProgressState({ satisfied: false, tentativeSatisfied: true }),
		).toBe("in-progress");
	});

	it("returns 'unmet' when both unsatisfied", () => {
		expect(
			resolveProgressState({ satisfied: false, tentativeSatisfied: false }),
		).toBe("unmet");
	});

	it("returns 'unmet' when tentative undefined and current unsatisfied", () => {
		expect(resolveProgressState({ satisfied: false })).toBe("unmet");
	});
});
