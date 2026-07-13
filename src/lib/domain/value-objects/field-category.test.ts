import { describe, expect, it } from "vitest";
import { FieldCategory } from "./field-category.ts";

describe("FieldCategory", () => {
	it("exposes the 4 constants", () => {
		expect(FieldCategory).toEqual({
			Humanities: "humanities",
			Social: "social",
			BioMedical: "bio-medical",
			Natural: "natural",
		});
	});
});
