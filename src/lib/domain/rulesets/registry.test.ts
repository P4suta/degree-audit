import { describe, expect, it } from "vitest";
import { StudentProfile } from "../entities/student-profile.ts";
import { ErrorCode } from "../errors/error-code.ts";
import { hasCode } from "../errors/guards.ts";
import { isErr, isOk } from "../errors/result.ts";
import { minCredits } from "../specifications/combinators/min-credits.ts";
import { SubjectCategory } from "../value-objects/subject-category.ts";
import { createRegistry } from "./registry.ts";
import type { RuleSet } from "./types.ts";

const mkRuleSet = (
	id: string,
	specificity: number,
	applicable: (p: StudentProfile) => boolean,
): RuleSet => ({
	metadata: {
		id,
		displayName: id,
		sourceRevision: "v1",
		applicableTo: applicable,
		specificity,
	},
	categoryMap: (input) => SubjectCategory.unknown(input.rawLabel),
	requirements: [],
	totalRequirement: minCredits({
		id: "total",
		label: "total",
		required: 0,
		predicate: () => true,
	}),
	thesisEligibility: minCredits({
		id: "thesis",
		label: "卒論履修資格",
		required: 0,
		predicate: () => true,
	}),
	totalCreditsRequired: 124,
});

const profile = (() => {
	const r = StudentProfile.parse({
		facultyId: "humanities",
		courseId: "philosophy",
		matriculationYear: 2022,
	});
	if (!isOk(r)) throw new Error("fixture");
	return r.value;
})();

describe("createRegistry.resolve", () => {
	it("returns the single matching rule set", () => {
		const rs = mkRuleSet("single", 10, () => true);
		const reg = createRegistry([rs]);
		const res = reg.resolve(profile);
		expect(isOk(res)).toBe(true);
		if (isOk(res)) expect(res.value.metadata.id).toBe("single");
	});

	it("returns the highest specificity among multiple matches", () => {
		const low = mkRuleSet("low", 1, () => true);
		const high = mkRuleSet("high", 100, () => true);
		const reg = createRegistry([low, high]);
		const res = reg.resolve(profile);
		expect(isOk(res)).toBe(true);
		if (isOk(res)) expect(res.value.metadata.id).toBe("high");
	});

	it("returns RuleSetNotFound when no rule set applies", () => {
		const rs = mkRuleSet("nomatch", 10, () => false);
		const reg = createRegistry([rs]);
		const res = reg.resolve(profile);
		expect(isErr(res)).toBe(true);
		if (isErr(res)) {
			expect(hasCode(res.error, ErrorCode.RuleSetNotFound)).toBe(true);
		}
	});

	it("returns RuleSetAmbiguous when ties exist at max specificity", () => {
		const a = mkRuleSet("a", 10, () => true);
		const b = mkRuleSet("b", 10, () => true);
		const reg = createRegistry([a, b]);
		const res = reg.resolve(profile);
		expect(isErr(res)).toBe(true);
		if (isErr(res)) {
			expect(hasCode(res.error, ErrorCode.RuleSetAmbiguous)).toBe(true);
			if (hasCode(res.error, ErrorCode.RuleSetAmbiguous)) {
				expect(res.error.context["candidates"]).toEqual(["a", "b"]);
			}
		}
	});

	it("returns RuleSetNotFound for an empty registry", () => {
		const reg = createRegistry([]);
		const res = reg.resolve(profile);
		expect(isErr(res)).toBe(true);
		if (isErr(res)) {
			expect(hasCode(res.error, ErrorCode.RuleSetNotFound)).toBe(true);
		}
	});
});
