import { describe, expect, it } from "vitest";
import { StudentProfile } from "../../entities/student-profile.ts";
import { isOk } from "../../errors/result.ts";
import { metadata } from "./metadata.ts";

const profileOf = (
	matriculationYear: number,
	courseId = "人文科学コース",
): StudentProfile => {
	const r = StudentProfile.parse({
		facultyId: "人文社会科学部",
		courseId,
		matriculationYear,
	});
	if (!isOk(r)) throw new Error("invalid fixture profile");
	return r.value;
};

describe("r6-humanities metadata.applicableTo", () => {
	it("matches 人文科学コース in 2024", () => {
		expect(metadata.applicableTo(profileOf(2024))).toBe(true);
	});

	it("matches 人文科学コース in 2026", () => {
		expect(metadata.applicableTo(profileOf(2026))).toBe(true);
	});

	it("matches 人文社会科学 fuzzy course id in 2024", () => {
		expect(metadata.applicableTo(profileOf(2024, "人文社会科学"))).toBe(true);
	});

	it("rejects 2023 (R5)", () => {
		expect(metadata.applicableTo(profileOf(2023))).toBe(false);
	});

	it("rejects 社会科学コース in 2024", () => {
		expect(metadata.applicableTo(profileOf(2024, "社会科学コース"))).toBe(
			false,
		);
	});

	it("has specificity > default's 100", () => {
		expect(metadata.specificity).toBeGreaterThan(100);
	});
});
