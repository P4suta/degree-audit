import { describe, expect, it } from "vitest";
import { detectTranscriptFormat } from "./detect-format.ts";

const enc = new TextEncoder();

describe("detectTranscriptFormat", () => {
	it("identifies MHTML by MIME-Version header", () => {
		const bytes = enc.encode("MIME-Version: 1.0\r\nContent-Type: ...");
		expect(detectTranscriptFormat(bytes)).toBe("mhtml");
	});

	it("identifies MHTML by top-level multipart Content-Type", () => {
		const bytes = enc.encode(
			'Content-Type: multipart/related; boundary="---"\r\n\r\n',
		);
		expect(detectTranscriptFormat(bytes)).toBe("mhtml");
	});

	it("identifies MHTML when Content-Type: multipart/related is mid-stream", () => {
		// STARTS doesn't match but the inner includes check should pick it up
		const bytes = enc.encode(
			"X-First-Header: something\r\nContent-Type: multipart/related; boundary=X\r\n",
		);
		expect(detectTranscriptFormat(bytes)).toBe("mhtml");
	});

	it("identifies MHTML when Content-Type: multipart/mixed is mid-stream", () => {
		const bytes = enc.encode(
			"X-First: abc\r\nContent-Type: multipart/mixed; boundary=Y\r\n",
		);
		expect(detectTranscriptFormat(bytes)).toBe("mhtml");
	});

	it("identifies MHTML starting with From:", () => {
		const bytes = enc.encode("From: <saved by Chromium>\nContent-Type: ...");
		expect(detectTranscriptFormat(bytes)).toBe("mhtml");
	});

	it("tolerates UTF-8 BOM and leading whitespace before MHTML headers", () => {
		const bytes = enc.encode("\uFEFF\r\n\r\nMIME-Version: 1.0\r\n");
		expect(detectTranscriptFormat(bytes)).toBe("mhtml");
	});

	it("returns unknown for empty buffer", () => {
		expect(detectTranscriptFormat(new Uint8Array(0))).toBe("unknown");
	});

	it("returns unknown for plain text without Kochi-specific signals", () => {
		const bytes = enc.encode("hello world\nnot a transcript");
		expect(detectTranscriptFormat(bytes)).toBe("unknown");
	});

	it("identifies text paste by 学則科目名称 header", () => {
		const bytes = enc.encode(
			"学則科目名称\t単位\t素点\t評価\t必選\t成績確定年度\n共通教育\n",
		);
		expect(detectTranscriptFormat(bytes)).toBe("text");
	});

	it("identifies text paste starting with 共通教育 marker", () => {
		const bytes = enc.encode("共通教育\n初年次科目\n大学基礎論\t2\t86\t優\n");
		expect(detectTranscriptFormat(bytes)).toBe("text");
	});

	it("identifies text paste with 専門科目 marker elsewhere in the first 2KB", () => {
		const bytes = enc.encode(
			`ページタイトル\n${"x".repeat(500)}\n専門科目\nゼミナール\n`,
		);
		expect(detectTranscriptFormat(bytes)).toBe("text");
	});

	it("returns unknown for arbitrary binary bytes", () => {
		const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
		expect(detectTranscriptFormat(bytes)).toBe("unknown");
	});
});
