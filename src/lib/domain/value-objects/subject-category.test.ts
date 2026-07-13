import { describe, expect, it } from "vitest";
import { kindDisplayName, SubjectCategory } from "./subject-category.ts";

describe("SubjectCategory factories", () => {
	it("produce bare kind objects", () => {
		expect(SubjectCategory.primary()).toEqual({
			kind: "common-education/primary",
		});
		expect(SubjectCategory.liberalCareer()).toEqual({
			kind: "common-education/liberal/career",
		});
		expect(SubjectCategory.seminar56Thesis()).toEqual({
			kind: "seminar/5-6-thesis",
		});
		expect(SubjectCategory.electiveOwnCourse()).toEqual({
			kind: "elective/own-course",
		});
		expect(SubjectCategory.electiveOtherFaculty()).toEqual({
			kind: "elective/other-faculty",
		});
	});

	it("unknown carries the raw label", () => {
		expect(SubjectCategory.unknown("謎の区分")).toEqual({
			kind: "unknown",
			raw: "謎の区分",
		});
	});
});

describe("kindDisplayName", () => {
	it("maps a kind to its Japanese display name", () => {
		expect(kindDisplayName("common-education/primary")).toBe("初年次科目");
		expect(kindDisplayName("elective/other-faculty")).toBe("他学部専門");
		expect(kindDisplayName("unknown")).toBe("区分未判定");
	});
});
