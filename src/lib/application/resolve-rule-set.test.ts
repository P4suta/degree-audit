import { describe, expect, it } from "vitest";
import { StudentProfile } from "../domain/entities/student-profile.ts";
import { isOk } from "../domain/errors/result.ts";
import { defaultRegistry } from "../domain/rulesets/index.ts";
import { resolveRuleSet } from "./resolve-rule-set.ts";

describe("resolveRuleSet", () => {
	it("delegates to the registry", () => {
		const parsed = StudentProfile.parse({
			facultyId: "humanities",
			courseId: "philosophy",
			matriculationYear: 2022,
		});
		if (!isOk(parsed)) throw new Error("fixture");
		const resolved = resolveRuleSet(parsed.value, defaultRegistry);
		expect(isOk(resolved)).toBe(true);
		if (isOk(resolved)) {
			expect(resolved.value.metadata.id).toBe("humanities/2020-2023");
		}
	});
});
