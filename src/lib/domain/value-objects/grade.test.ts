import { describe, expect, it } from "vitest";
import { Grade, isInProgress, isPassing } from "./grade.ts";

describe("Grade", () => {
	it("has all 10 literal values", () => {
		expect(Object.values(Grade)).toEqual([
			"秀",
			"優",
			"良",
			"可",
			"不可",
			"認定",
			"取消",
			"放棄",
			"履修中",
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
		Grade.Risyuchu,
		Grade.Unknown,
	])("%s is not passing", (g) => {
		expect(isPassing(g)).toBe(false);
	});
});

describe("isInProgress", () => {
	it("returns true for 履修中", () => {
		expect(isInProgress(Grade.Risyuchu)).toBe(true);
	});

	it.each([
		Grade.Shu,
		Grade.Yu,
		Grade.Ryo,
		Grade.Ka,
		Grade.Fuka,
		Grade.Nintei,
		Grade.Torikeshi,
		Grade.Hoki,
		Grade.Unknown,
	])("%s is not in-progress", (g) => {
		expect(isInProgress(g)).toBe(false);
	});
});
