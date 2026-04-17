import { describe, expect, it } from "vitest";
import { FieldCategory } from "./field-category.ts";
import {
	isCommonEducation,
	isElective,
	isKind,
	isLiberal,
	isPlatform,
	isSeminar,
	SubjectCategory,
} from "./subject-category.ts";

describe("SubjectCategory factories", () => {
	it("primary / liberalCareer / seminar / platform / elective produce bare kind objects", () => {
		expect(SubjectCategory.primary()).toEqual({
			kind: "common-education/primary",
		});
		expect(SubjectCategory.liberalCareer()).toEqual({
			kind: "common-education/liberal/career",
		});
		expect(SubjectCategory.seminar12()).toEqual({ kind: "seminar/1-2" });
		expect(SubjectCategory.seminar34Spring()).toEqual({
			kind: "seminar/3-4/spring",
		});
		expect(SubjectCategory.seminar34Fall()).toEqual({
			kind: "seminar/3-4/fall",
		});
		expect(SubjectCategory.seminar56Thesis()).toEqual({
			kind: "seminar/5-6-thesis",
		});
		expect(SubjectCategory.platformBasicA()).toEqual({
			kind: "platform/basic-a",
		});
		expect(SubjectCategory.platformBasicB()).toEqual({
			kind: "platform/basic-b",
		});
		expect(SubjectCategory.platformForeignLanguage()).toEqual({
			kind: "platform/foreign-language",
		});
		expect(SubjectCategory.platformAdvanced()).toEqual({
			kind: "platform/advanced",
		});
		expect(SubjectCategory.electiveOwnCourse()).toEqual({
			kind: "elective/own-course",
		});
		expect(SubjectCategory.electiveOtherCourse()).toEqual({
			kind: "elective/other-course",
		});
		expect(SubjectCategory.electiveOtherFaculty()).toEqual({
			kind: "elective/other-faculty",
		});
	});

	it("liberalField attaches a field", () => {
		expect(SubjectCategory.liberalField(FieldCategory.Humanities)).toEqual({
			kind: "common-education/liberal/field",
			field: FieldCategory.Humanities,
		});
	});

	it("liberalForeignLanguage attaches a language", () => {
		expect(SubjectCategory.liberalForeignLanguage("英語")).toEqual({
			kind: "common-education/liberal/foreign-language",
			language: "英語",
		});
	});

	it("unknown carries the raw label", () => {
		expect(SubjectCategory.unknown("謎の区分")).toEqual({
			kind: "unknown",
			raw: "謎の区分",
		});
	});
});

describe("isKind", () => {
	it("narrows to the requested kind", () => {
		const c = SubjectCategory.liberalField(FieldCategory.Natural);
		expect(isKind(c, "common-education/liberal/field")).toBe(true);
		expect(isKind(c, "platform/basic-a")).toBe(false);
		if (isKind(c, "common-education/liberal/field")) {
			expect(c.field).toBe(FieldCategory.Natural);
		}
	});
});

describe("group predicates", () => {
	it.each([
		[SubjectCategory.primary(), "common-education"],
		[SubjectCategory.liberalCareer(), "common-education"],
		[SubjectCategory.liberalField(FieldCategory.Social), "common-education"],
		[SubjectCategory.seminar12(), "seminar"],
		[SubjectCategory.seminar34Spring(), "seminar"],
		[SubjectCategory.seminar34Fall(), "seminar"],
		[SubjectCategory.seminar56Thesis(), "seminar"],
		[SubjectCategory.platformBasicA(), "platform"],
		[SubjectCategory.platformAdvanced(), "platform"],
		[SubjectCategory.electiveOwnCourse(), "elective"],
		[SubjectCategory.electiveOtherFaculty(), "elective"],
	])("classifies %o into group %s", (category, group) => {
		expect(isCommonEducation(category)).toBe(group === "common-education");
		expect(isSeminar(category)).toBe(group === "seminar");
		expect(isPlatform(category)).toBe(group === "platform");
		expect(isElective(category)).toBe(group === "elective");
	});

	it("isLiberal is true for liberal subcategories only", () => {
		expect(isLiberal(SubjectCategory.liberalCareer())).toBe(true);
		expect(isLiberal(SubjectCategory.liberalField(FieldCategory.Social))).toBe(
			true,
		);
		expect(isLiberal(SubjectCategory.liberalForeignLanguage("英語"))).toBe(
			true,
		);
		expect(isLiberal(SubjectCategory.primary())).toBe(false);
		expect(isLiberal(SubjectCategory.platformBasicA())).toBe(false);
	});

	it("unknown categories are not in any group", () => {
		const u = SubjectCategory.unknown("x");
		expect(isCommonEducation(u)).toBe(false);
		expect(isSeminar(u)).toBe(false);
		expect(isPlatform(u)).toBe(false);
		expect(isElective(u)).toBe(false);
		expect(isLiberal(u)).toBe(false);
	});
});
