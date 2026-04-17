import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isErr, isOk } from "../../../domain/errors/result.ts";
import { pdfParser } from "./pdf-parser.ts";

const FIXTURE_PATH = "tests/fixtures/transcript.pdf";

describe.skipIf(!existsSync(FIXTURE_PATH))(
	"pdfParser on real Kochi individual grade PDF fixture",
	() => {
		// pdfjs-dist は getDocument 呼び出しで内部的に ArrayBuffer を transfer
		// （detach）する。同じ Uint8Array を使い回すと 2 回目以降は空バッファで
		// 失敗するので、各テストで新規に読み直す。
		const readBytes = () => new Uint8Array(readFileSync(FIXTURE_PATH));

		it("decodes without error", async () => {
			const result = await pdfParser.parse(readBytes());
			expect(isOk(result)).toBe(true);
		});

		it("extracts at least 20 course rows with the expected shape", async () => {
			const result = await pdfParser.parse(readBytes());
			expect(isOk(result)).toBe(true);
			if (!isOk(result)) return;
			const rows = result.value;
			expect(rows.length).toBeGreaterThan(20);
			for (const row of rows) {
				expect(row.name).toBeTypeOf("string");
				expect(row.name.length).toBeGreaterThan(0);
				expect(row.creditText).toMatch(/^\d+$/);
				expect(row.rawCategoryLabel).toBeTypeOf("string");
			}
		});

		it("attaches section breadcrumbs starting with [共通教育] / [専門科目]", async () => {
			const result = await pdfParser.parse(readBytes());
			if (!isOk(result)) throw new Error("expected ok");
			const topLevels = new Set(
				result.value.map((r) => r.rawCategoryLabel.split(" / ")[0]),
			);
			expect(topLevels.has("共通教育")).toBe(true);
			expect(topLevels.has("専門科目")).toBe(true);
		});

		it("classifies 初年次 rows under 共通教育 / 初年次科目", async () => {
			const result = await pdfParser.parse(readBytes());
			if (!isOk(result)) throw new Error("expected ok");
			const row = result.value.find((r) => r.name.startsWith("大学基礎論"));
			expect(row?.rawCategoryLabel).toBe("共通教育 / 初年次科目");
		});

		it("classifies foreign-language rows under 共通教育 / 教養科目 / 外国語分野", async () => {
			const result = await pdfParser.parse(readBytes());
			if (!isOk(result)) throw new Error("expected ok");
			const row = result.value.find((r) => r.name === "中国語I");
			expect(row?.rawCategoryLabel).toBe("共通教育 / 教養科目 / 外国語分野");
		});

		it("classifies ゼミ I・II rows under 専門科目 / ゼミナール科目 / ゼミナールI・II", async () => {
			const result = await pdfParser.parse(readBytes());
			if (!isOk(result)) throw new Error("expected ok");
			const row = result.value.find((r) => r.name === "西洋哲学基礎演習");
			expect(row?.rawCategoryLabel).toBe(
				"専門科目 / ゼミナール科目 / ゼミナールI・II",
			);
		});

		it("classifies ゼミ III・IV rows under 専門科目 / ゼミナール科目 / ゼミナールIII・IV", async () => {
			const result = await pdfParser.parse(readBytes());
			if (!isOk(result)) throw new Error("expected ok");
			const row = result.value.find((r) => r.name === "西洋近代思想演習Ⅰ");
			expect(row?.rawCategoryLabel).toBe(
				"専門科目 / ゼミナール科目 / ゼミナールIII・IV",
			);
		});

		it("picks up 卒業論文・ゼミナール V・VI with 8 credits and 履 grade", async () => {
			const result = await pdfParser.parse(readBytes());
			if (!isOk(result)) throw new Error("expected ok");
			const row = result.value.find((r) => r.name.startsWith("卒業論文"));
			expect(row).toBeDefined();
			expect(row?.creditText).toBe("8");
			expect(row?.gradeText).toBe("履");
		});

		it("classifies 他学部 rows under 専門科目 / 選択科目 / 他学部専門科目", async () => {
			const result = await pdfParser.parse(readBytes());
			if (!isOk(result)) throw new Error("expected ok");
			const row = result.value.find((r) => r.name === "会計学概論");
			expect(row?.rawCategoryLabel).toBe(
				"専門科目 / 選択科目 / 他学部専門科目",
			);
		});
	},
);

describe("pdfParser error paths", () => {
	it("rejects an empty buffer with PdfDecodingFailed", async () => {
		const result = await pdfParser.parse(new Uint8Array(0));
		expect(isErr(result)).toBe(true);
	});

	it("rejects a buffer exceeding the size limit", async () => {
		const huge = new Uint8Array(21 * 1024 * 1024);
		const result = await pdfParser.parse(huge);
		expect(isErr(result)).toBe(true);
	});
});
