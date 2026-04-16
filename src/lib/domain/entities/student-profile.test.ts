import { describe, expect, it } from "vitest";
import { ErrorCode } from "../errors/error-code.ts";
import { hasCode } from "../errors/guards.ts";
import { isErr, isOk } from "../errors/result.ts";
import { StudentProfile } from "./student-profile.ts";

describe("StudentProfile.parse", () => {
	it("accepts a minimal valid profile", () => {
		const result = StudentProfile.parse({
			facultyId: "humanities",
			courseId: "philosophy",
			matriculationYear: 2022,
		});
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value.facultyId).toBe("humanities");
			expect(result.value.courseId).toBe("philosophy");
			expect(result.value.matriculationYear).toBe(2022);
			expect(result.value.extras).toEqual({});
			expect(Object.isFrozen(result.value.extras)).toBe(true);
		}
	});

	it("preserves extras of type string / number", () => {
		const result = StudentProfile.parse({
			facultyId: "humanities",
			courseId: "philosophy",
			matriculationYear: 2022,
			extras: { minor: "art", cohort: 3 },
		});
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value.extras).toEqual({ minor: "art", cohort: 3 });
		}
	});

	it("rejects missing required fields", () => {
		const result = StudentProfile.parse({ facultyId: "x" });
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(hasCode(result.error, ErrorCode.StudentProfileInvalid)).toBe(true);
		}
	});

	it("rejects empty-string facultyId / courseId", () => {
		for (const key of ["facultyId", "courseId"] as const) {
			const input: Record<string, unknown> = {
				facultyId: "x",
				courseId: "y",
				matriculationYear: 2020,
			};
			input[key] = "   ";
			const result = StudentProfile.parse(input);
			expect(isErr(result)).toBe(true);
		}
	});

	it("rejects matriculationYear outside [1900, 2100]", () => {
		const r1 = StudentProfile.parse({
			facultyId: "x",
			courseId: "y",
			matriculationYear: 1899,
		});
		const r2 = StudentProfile.parse({
			facultyId: "x",
			courseId: "y",
			matriculationYear: 2101,
		});
		expect(isErr(r1)).toBe(true);
		expect(isErr(r2)).toBe(true);
	});

	it("rejects non-integer matriculationYear", () => {
		const r = StudentProfile.parse({
			facultyId: "x",
			courseId: "y",
			matriculationYear: 2020.5,
		});
		expect(isErr(r)).toBe(true);
	});

	it("rejects extras with non-string/number values", () => {
		const r = StudentProfile.parse({
			facultyId: "x",
			courseId: "y",
			matriculationYear: 2020,
			extras: { bad: true },
		});
		expect(isErr(r)).toBe(true);
	});

	it("rejects unknown top-level keys (strict mode)", () => {
		const r = StudentProfile.parse({
			facultyId: "x",
			courseId: "y",
			matriculationYear: 2020,
			unknownField: "z",
		});
		expect(isErr(r)).toBe(true);
	});
});
