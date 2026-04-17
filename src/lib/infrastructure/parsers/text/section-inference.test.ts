import { describe, expect, it } from "vitest";
import { findSectionHint, isKnownSection } from "./section-inference.ts";

describe("findSectionHint", () => {
	it("classifies 共通教育 as top", () => {
		expect(findSectionHint("共通教育")).toEqual({
			level: "top",
			value: "共通教育",
		});
	});

	it("classifies 教養科目 as mid with 共通教育 as parent top", () => {
		expect(findSectionHint("教養科目")).toEqual({
			level: "mid",
			value: "教養科目",
			top: "共通教育",
		});
	});

	it("classifies 人文分野 as leaf under 共通教育 / 教養科目", () => {
		expect(findSectionHint("人文分野")).toEqual({
			level: "leaf",
			value: "人文分野",
			top: "共通教育",
			mid: "教養科目",
		});
	});

	it("classifies 基礎科目Ａ群 (fullwidth Ａ) as leaf under 専門科目 / プラットフォーム科目", () => {
		expect(findSectionHint("基礎科目Ａ群")).toEqual({
			level: "leaf",
			value: "基礎科目Ａ群",
			top: "専門科目",
			mid: "プラットフォーム科目",
		});
	});

	it("tolerates halfwidth ASCII A for 基礎科目A群 via matchKey normalization", () => {
		// matchKey は NFKC で fullwidth A → ASCII A へ変換するので、表記ゆれに強い
		const hint = findSectionHint("基礎科目A群");
		expect(hint?.level).toBe("leaf");
		if (hint?.level === "leaf") expect(hint.mid).toBe("プラットフォーム科目");
	});

	it("classifies 他コース専門科目 as leaf under 専門科目 / 選択科目", () => {
		expect(findSectionHint("他コース専門科目")).toEqual({
			level: "leaf",
			value: "他コース専門科目",
			top: "専門科目",
			mid: "選択科目",
		});
	});

	it("classifies ゼミナールIII・IV (fullwidth Roman) as leaf under 専門科目 / ゼミナール科目", () => {
		expect(findSectionHint("ゼミナールIII・IV")).toEqual({
			level: "leaf",
			value: "ゼミナールIII・IV",
			top: "専門科目",
			mid: "ゼミナール科目",
		});
	});

	it("returns undefined for unknown names", () => {
		expect(findSectionHint("謎の分野")).toBeUndefined();
	});

	it("returns undefined for empty string", () => {
		expect(findSectionHint("")).toBeUndefined();
	});
});

describe("isKnownSection", () => {
	it("is true for known section names", () => {
		expect(isKnownSection("共通教育")).toBe(true);
		expect(isKnownSection("教養科目")).toBe(true);
		expect(isKnownSection("人文分野")).toBe(true);
	});

	it("is false for course-like names", () => {
		expect(isKnownSection("大学基礎論")).toBe(false);
		expect(isKnownSection("中国語I")).toBe(false);
	});
});
