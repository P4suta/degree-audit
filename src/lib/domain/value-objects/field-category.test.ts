import { describe, expect, it } from "vitest";
import {
	FIELD_CATEGORIES,
	FIELD_CATEGORY_LABELS,
	FieldCategory,
} from "./field-category.ts";

describe("FieldCategory", () => {
	it("exposes the 4 constants", () => {
		expect(FieldCategory).toEqual({
			Humanities: "humanities",
			Social: "social",
			BioMedical: "bio-medical",
			Natural: "natural",
		});
	});

	it("FIELD_CATEGORIES contains all 4 values", () => {
		expect(FIELD_CATEGORIES).toHaveLength(4);
		expect(new Set(FIELD_CATEGORIES)).toEqual(
			new Set(Object.values(FieldCategory)),
		);
	});

	it("FIELD_CATEGORY_LABELS has Japanese labels for all fields", () => {
		expect(FIELD_CATEGORY_LABELS).toEqual({
			humanities: "人文",
			social: "社会",
			"bio-medical": "生命医療",
			natural: "自然",
		});
	});
});
