import { describe, expect, it } from "vitest";
import { Grade, isPassing, parseGrade } from "./grade.ts";

describe("Grade", () => {
	it("has all 9 literal values", () => {
		expect(Object.values(Grade)).toEqual([
			"秀",
			"優",
			"良",
			"可",
			"不可",
			"認定",
			"取消",
			"放棄",
			"不明",
		]);
	});
});

describe("isPassing", () => {
	it.each([
		Grade.Shu,
		Grade.Yu,
		Grade.Ryo,
		Grade.Ka,
		Grade.Nintei,
	])("%s is passing", (g) => {
		expect(isPassing(g)).toBe(true);
	});

	it.each([
		Grade.Fuka,
		Grade.Torikeshi,
		Grade.Hoki,
		Grade.Unknown,
	])("%s is not passing", (g) => {
		expect(isPassing(g)).toBe(false);
	});
});

describe("parseGrade", () => {
	it.each([
		["秀", Grade.Shu],
		["優", Grade.Yu],
		["良", Grade.Ryo],
		["可", Grade.Ka],
		["不可", Grade.Fuka],
		["認定", Grade.Nintei],
		["取消", Grade.Torikeshi],
		["履修取消", Grade.Torikeshi],
		["放棄", Grade.Hoki],
		["履修放棄", Grade.Hoki],
	])("maps %s to %s", (raw, expected) => {
		expect(parseGrade(raw)).toBe(expected);
	});

	it.each([
		["A+", Grade.Shu],
		["a+", Grade.Shu],
		["AP", Grade.Shu],
		["A", Grade.Yu],
		["B", Grade.Ryo],
		["C", Grade.Ka],
		["F", Grade.Fuka],
		["D", Grade.Fuka],
		["P", Grade.Nintei],
		["Pass", Grade.Nintei],
		["W", Grade.Torikeshi],
	])("maps English alias %s to %s", (raw, expected) => {
		expect(parseGrade(raw)).toBe(expected);
	});

	it("trims whitespace", () => {
		expect(parseGrade("  秀  ")).toBe(Grade.Shu);
	});

	it("returns Unknown for empty string", () => {
		expect(parseGrade("")).toBe(Grade.Unknown);
		expect(parseGrade("   ")).toBe(Grade.Unknown);
	});

	it("returns Unknown for unrecognised values", () => {
		expect(parseGrade("???")).toBe(Grade.Unknown);
		expect(parseGrade("EXCELLENT")).toBe(Grade.Unknown);
	});
});
