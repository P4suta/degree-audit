import { describe, expect, it } from "vitest";
import { detectTranscriptFormat } from "./detect-format.ts";

const enc = new TextEncoder();

describe("detectTranscriptFormat", () => {
	it("identifies PDF by %PDF- magic bytes", () => {
		const bytes = enc.encode("%PDF-1.7\n...");
		expect(detectTranscriptFormat(bytes)).toBe("pdf");
	});

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

	it("returns unknown for plain text or other formats", () => {
		const bytes = enc.encode("hello world\nnot a transcript");
		expect(detectTranscriptFormat(bytes)).toBe("unknown");
	});

	it("returns unknown for binary that isn't PDF", () => {
		const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
		expect(detectTranscriptFormat(bytes)).toBe("unknown");
	});
});
