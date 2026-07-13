import { describe, expect, it } from "vitest";
import { fieldLabel, kindLabel, requirementLabel, unitLabel } from "./labels.ts";

describe("requirementLabel", () => {
	it("maps known requirement ids to localized labels", () => {
		expect(requirementLabel("primary-12")).toBe("初年次科目");
		expect(requirementLabel("elective-38")).toBe("選択科目");
		expect(requirementLabel("elective-42")).toBe("選択科目");
		expect(requirementLabel("total-124")).toBe("総修得単位");
		expect(requirementLabel("thesis-eligibility")).toBe("卒業論文履修資格");
	});

	it("falls back to the raw id for unknown requirement ids", () => {
		expect(requirementLabel("some-custom-id")).toBe("some-custom-id");
	});
});

describe("kindLabel", () => {
	it("maps a subject-category kind to its localized label", () => {
		expect(kindLabel("common-education/primary")).toBe("初年次科目");
		expect(kindLabel("elective/other-faculty")).toBe("他学部専門");
		expect(kindLabel("unknown")).toBe("区分未判定");
	});
});

describe("fieldLabel", () => {
	it("maps a field category to its localized label", () => {
		expect(fieldLabel("humanities")).toBe("人文");
		expect(fieldLabel("bio-medical")).toBe("生命医療");
	});
});

describe("unitLabel", () => {
	it("maps unit keys to localized labels", () => {
		expect(unitLabel("field")).toBe("分野");
		expect(unitLabel("language")).toBe("言語");
		expect(unitLabel("subject")).toBe("科目");
		expect(unitLabel("requirement")).toBe("要件");
	});

	it("defaults to credits when the unit is omitted", () => {
		expect(unitLabel(undefined)).toBe("単位");
	});
});
