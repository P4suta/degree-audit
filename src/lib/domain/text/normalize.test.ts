import { describe, expect, it } from "vitest";
import {
	canonicalize,
	DEFAULT_MAX_INLINE_LENGTH,
	matchKey,
	sanitizeLine,
} from "./normalize.ts";

describe("canonicalize", () => {
	it("applies NFKC (full-width → half-width, Roman numerals)", () => {
		expect(canonicalize("ＡＢＣ１２３")).toBe("ABC123");
		expect(canonicalize("Ⅰ Ⅱ Ⅲ Ⅳ Ⅴ Ⅵ")).toBe("I II III IV V VI");
		expect(canonicalize("（テスト）")).toBe("(テスト)");
	});

	it("removes zero-width characters (ZWSP / ZWNJ / ZWJ / BOM)", () => {
		expect(canonicalize("a\u200Bb\u200Cc\u200Dd\uFEFFe")).toBe("abcde");
	});

	it("removes C0/C1 control characters but preserves \\n \\r \\t", () => {
		expect(canonicalize("a\u0001b\u007Fc")).toBe("abc");
		expect(canonicalize("line1\nline2\tcol\rend")).toBe(
			"line1\nline2\tcol\rend",
		);
	});

	it("is a no-op on already-clean ASCII", () => {
		expect(canonicalize("hello world")).toBe("hello world");
	});
});

describe("sanitizeLine", () => {
	it("collapses line breaks and consecutive whitespace", () => {
		expect(sanitizeLine("a\n\nb\r\nc   d")).toBe("a b c d");
	});

	it("trims leading and trailing whitespace", () => {
		expect(sanitizeLine("  foo  ")).toBe("foo");
	});

	it("truncates to the max length", () => {
		const long = "a".repeat(DEFAULT_MAX_INLINE_LENGTH + 50);
		expect(sanitizeLine(long).length).toBe(DEFAULT_MAX_INLINE_LENGTH);
	});

	it("accepts a custom max length", () => {
		expect(sanitizeLine("abcdef", 3)).toBe("abc");
	});

	it("normalises full-width and strips zero-width characters", () => {
		expect(sanitizeLine("Ａ\u200Bｂ")).toBe("Ab");
	});

	it("returns empty string for blank input", () => {
		expect(sanitizeLine("   \t \n ")).toBe("");
	});
});

describe("matchKey", () => {
	it("produces the same key for width variants of the same text", () => {
		expect(matchKey("基礎Ａ")).toBe(matchKey("基礎A"));
		expect(matchKey("ゼミナールⅤ・Ⅵ")).toBe(matchKey("ゼミナールV・VI"));
	});

	it("strips decorative markers", () => {
		expect(matchKey("政治学概論 ★")).toBe("政治学概論");
		expect(matchKey("大学政策論入門※")).toBe("大学政策論入門");
	});

	it("lowercases alphabetic characters", () => {
		expect(matchKey("PF")).toBe("pf");
	});

	it("removes all whitespace (not just trims)", () => {
		expect(matchKey("共通 教育 / 初年次")).toBe("共通教育/初年次");
	});
});
