import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isOk } from "../../../domain/errors/result.ts";
import { parseTranscriptText } from "./text-parser.ts";

const FIXTURE_PATH = "tests/fixtures/transcript-paste.txt";

describe.skipIf(!existsSync(FIXTURE_PATH))(
	"textParser on real Kochi Web 成績 paste fixture",
	() => {
		const src = existsSync(FIXTURE_PATH)
			? readFileSync(FIXTURE_PATH, "utf-8")
			: "";

		it("extracts at least 70 course rows", () => {
			const r = parseTranscriptText(src);
			expect(isOk(r)).toBe(true);
			if (!isOk(r)) return;
			expect(r.value.length).toBeGreaterThanOrEqual(70);
		});

		it("attaches 共通教育 and 専門科目 top-levels", () => {
			const r = parseTranscriptText(src);
			if (!isOk(r)) throw new Error("expected ok");
			const tops = new Set(
				r.value.map((c) => c.rawCategoryLabel.split(" / ")[0]),
			);
			expect(tops.has("共通教育")).toBe(true);
			expect(tops.has("専門科目")).toBe(true);
		});

		it("classifies 大学基礎論 under 共通教育 / 初年次科目", () => {
			const r = parseTranscriptText(src);
			if (!isOk(r)) throw new Error("expected ok");
			const row = r.value.find((c) => c.name.startsWith("大学基礎論"));
			expect(row?.rawCategoryLabel).toBe("共通教育 / 初年次科目");
		});

		it("classifies 中国語I under 共通教育 / 教養科目 / 外国語分野", () => {
			const r = parseTranscriptText(src);
			if (!isOk(r)) throw new Error("expected ok");
			const row = r.value.find((c) => c.name === "中国語I");
			expect(row?.rawCategoryLabel).toBe("共通教育 / 教養科目 / 外国語分野");
		});

		it("classifies 西洋哲学基礎演習 under 専門科目 / ゼミナール科目 / ゼミナールI・II", () => {
			const r = parseTranscriptText(src);
			if (!isOk(r)) throw new Error("expected ok");
			const row = r.value.find((c) => c.name === "西洋哲学基礎演習");
			expect(row?.rawCategoryLabel).toBe(
				"専門科目 / ゼミナール科目 / ゼミナールI・II",
			);
		});

		it("classifies 西洋近代思想演習Ⅰ under 専門科目 / ゼミナール科目 / ゼミナールIII・IV", () => {
			const r = parseTranscriptText(src);
			if (!isOk(r)) throw new Error("expected ok");
			const row = r.value.find((c) => c.name === "西洋近代思想演習Ⅰ");
			expect(row?.rawCategoryLabel).toBe(
				"専門科目 / ゼミナール科目 / ゼミナールIII・IV",
			);
		});

		it("classifies 会計学概論 under 専門科目 / 選択科目 / 他学部専門科目", () => {
			const r = parseTranscriptText(src);
			if (!isOk(r)) throw new Error("expected ok");
			const row = r.value.find((c) => c.name === "会計学概論");
			expect(row?.rawCategoryLabel).toBe(
				"専門科目 / 選択科目 / 他学部専門科目",
			);
		});

		it("captures 卒業論文・ゼミナールⅤ・Ⅵ with 8 credits and 履修中 grade", () => {
			const r = parseTranscriptText(src);
			if (!isOk(r)) throw new Error("expected ok");
			const row = r.value.find((c) => c.name.startsWith("卒業論文"));
			expect(row).toBeDefined();
			expect(row?.creditText).toBe("8");
			expect(row?.gradeText).toBe("履修中");
		});

		it("does not include summary-table values (e.g., lines with only numbers)", () => {
			const r = parseTranscriptText(src);
			if (!isOk(r)) throw new Error("expected ok");
			// No entry should have name that looks like a summary row e.g. "履修中"
			const suspicious = r.value.filter(
				(c) =>
					c.name === "履修中" || c.name === "修得済" || c.name === "要件必要",
			);
			expect(suspicious).toHaveLength(0);
		});
	},
);
