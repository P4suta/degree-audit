import { describe, expect, it } from "vitest";
import { StudentProfile } from "../../entities/student-profile.ts";
import { isOk } from "../../errors/result.ts";
import { metadata } from "./metadata.ts";

const profileFor = (year: number) => {
	const r = StudentProfile.parse({
		facultyId: "humanities",
		courseId: "philosophy",
		matriculationYear: year,
	});
	if (!isOk(r)) throw new Error("fixture");
	return r.value;
};

describe("default ruleset metadata", () => {
	it.each([
		2020, 2021, 2022, 2023,
	])("applicableTo returns true for matriculation year %d", (y) => {
		expect(metadata.applicableTo(profileFor(y))).toBe(true);
	});

	it.each([
		2019, 2024,
	])("applicableTo returns false outside the supported range (%d)", (y) => {
		expect(metadata.applicableTo(profileFor(y))).toBe(false);
	});

	it("has the expected identifiers", () => {
		expect(metadata.id).toBe("kochi-university/2020-2023");
		expect(metadata.specificity).toBe(100);
	});
});
