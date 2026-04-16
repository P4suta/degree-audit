import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ErrorCode } from "../../../domain/errors/error-code.ts";
import { hasCode } from "../../../domain/errors/guards.ts";
import { isErr, isOk } from "../../../domain/errors/result.ts";
import {
	charsetOf,
	decodeBase64,
	decodePart,
	decodeQuotedPrintable,
} from "./decoding.ts";

const encodeQuotedPrintable = (text: string): string => {
	const utf8 = new TextEncoder().encode(text);
	let out = "";
	for (const byte of utf8) {
		if (byte === 0x20) {
			out += " ";
		} else if (byte >= 0x21 && byte <= 0x7e && byte !== 0x3d) {
			out += String.fromCharCode(byte);
		} else {
			out += `=${byte.toString(16).toUpperCase().padStart(2, "0")}`;
		}
	}
	return out;
};

describe("decodeQuotedPrintable", () => {
	it("decodes plain ASCII as-is", () => {
		const r = decodeQuotedPrintable("hello world");
		expect(isOk(r) && r.value).toBe("hello world");
	});

	it("decodes hex-escaped UTF-8 bytes", () => {
		const r = decodeQuotedPrintable("=E6=97=A5=E6=9C=AC");
		expect(isOk(r) && r.value).toBe("日本");
	});

	it("strips soft line breaks", () => {
		const r = decodeQuotedPrintable("foo=\r\nbar");
		expect(isOk(r) && r.value).toBe("foobar");
	});

	it("leaves non-hex '=' sequences intact", () => {
		const r = decodeQuotedPrintable("a=XYb");
		expect(isOk(r) && r.value).toBe("a=XYb");
	});

	it("returns MhtmlDecodingFailed for unsupported charsets", () => {
		const r = decodeQuotedPrintable("hi", "not-a-real-charset");
		expect(isErr(r)).toBe(true);
		if (isErr(r)) {
			expect(hasCode(r.error, ErrorCode.MhtmlDecodingFailed)).toBe(true);
		}
	});

	it("is an inverse of encoding for UTF-8 strings", () => {
		fc.assert(
			fc.property(fc.string({ maxLength: 32 }), (input) => {
				const encoded = encodeQuotedPrintable(input);
				const r = decodeQuotedPrintable(encoded);
				expect(isOk(r)).toBe(true);
				if (isOk(r)) expect(r.value).toBe(input);
			}),
		);
	});
});

describe("decodeBase64", () => {
	it("decodes base64 UTF-8", () => {
		const encoded = btoa(
			String.fromCharCode(...new TextEncoder().encode("こんにちは")),
		);
		const r = decodeBase64(encoded);
		expect(isOk(r) && r.value).toBe("こんにちは");
	});

	it("ignores whitespace in the input", () => {
		const encoded = `aGVsbG8\n= `;
		const r = decodeBase64(encoded);
		expect(isOk(r) && r.value).toBe("hello");
	});

	it("returns MhtmlDecodingFailed for invalid base64", () => {
		const r = decodeBase64("!!!not_base64!!!");
		expect(isErr(r)).toBe(true);
	});
});

describe("charsetOf", () => {
	it("picks quoted charset param from content-type", () => {
		const headers = new Map([
			["content-type", 'text/html; charset="Shift_JIS"'],
		]);
		expect(charsetOf({ headers, body: "" })).toBe("shift_jis");
	});

	it("picks unquoted charset param", () => {
		const headers = new Map([["content-type", "text/html; charset=UTF-8"]]);
		expect(charsetOf({ headers, body: "" })).toBe("utf-8");
	});

	it("defaults to utf-8 when no charset is present", () => {
		const headers = new Map([["content-type", "text/html"]]);
		expect(charsetOf({ headers, body: "" })).toBe("utf-8");
	});

	it("defaults to utf-8 when the content-type header is absent", () => {
		const headers = new Map<string, string>();
		expect(charsetOf({ headers, body: "" })).toBe("utf-8");
	});
});

describe("decodePart", () => {
	it("routes quoted-printable to decodeQuotedPrintable", () => {
		const headers = new Map([
			["content-type", "text/html; charset=UTF-8"],
			["content-transfer-encoding", "quoted-printable"],
		]);
		const r = decodePart({ headers, body: "=E6=97=A5=E6=9C=AC" });
		expect(isOk(r) && r.value).toBe("日本");
	});

	it("routes base64 to decodeBase64", () => {
		const headers = new Map([
			["content-type", "text/plain"],
			["content-transfer-encoding", "base64"],
		]);
		const body = btoa("hello");
		const r = decodePart({ headers, body });
		expect(isOk(r) && r.value).toBe("hello");
	});

	it.each([
		"7bit",
		"8bit",
		"binary",
	])("passes through %s unchanged", (encoding) => {
		const headers = new Map([
			["content-type", "text/plain"],
			["content-transfer-encoding", encoding],
		]);
		const r = decodePart({ headers, body: "ok" });
		expect(isOk(r) && r.value).toBe("ok");
	});

	it("defaults to 7bit when encoding header is missing", () => {
		const headers = new Map([["content-type", "text/plain"]]);
		const r = decodePart({ headers, body: "no-encoding" });
		expect(isOk(r) && r.value).toBe("no-encoding");
	});

	it("returns MhtmlDecodingFailed for unknown encodings", () => {
		const headers = new Map([
			["content-type", "text/plain"],
			["content-transfer-encoding", "x-weird"],
		]);
		const r = decodePart({ headers, body: "" });
		expect(isErr(r)).toBe(true);
		if (isErr(r)) {
			expect(hasCode(r.error, ErrorCode.MhtmlDecodingFailed)).toBe(true);
		}
	});
});
