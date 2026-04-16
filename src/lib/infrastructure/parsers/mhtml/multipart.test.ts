import { describe, expect, it } from "vitest";
import { ErrorCode } from "../../../domain/errors/error-code.ts";
import { hasCode } from "../../../domain/errors/guards.ts";
import { isErr, isOk } from "../../../domain/errors/result.ts";
import { splitMultipart } from "./multipart.ts";

const fixture = (lines: readonly string[]): string => lines.join("\r\n");

describe("splitMultipart", () => {
	it("splits parts and parses headers", () => {
		const source = fixture([
			'Content-Type: multipart/related; boundary="---BOUNDARY"',
			"",
			"-----BOUNDARY",
			"Content-Type: text/html; charset=UTF-8",
			"Content-Transfer-Encoding: 8bit",
			"",
			"<html></html>",
			"-----BOUNDARY",
			"Content-Type: text/css",
			"",
			"body { color: red }",
			"-----BOUNDARY--",
		]);
		const result = splitMultipart(source);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value).toHaveLength(2);
			expect(result.value[0]?.headers.get("content-type")).toBe(
				"text/html; charset=UTF-8",
			);
			expect(result.value[0]?.body).toBe("<html></html>");
			expect(result.value[1]?.body).toBe("body { color: red }");
		}
	});

	it("accepts a Content-Type folded across multiple lines (tab continuation)", () => {
		const source = [
			"Content-Type: multipart/related;",
			'\ttype="text/html";',
			'\tboundary="FOLDED"',
			"",
			"--FOLDED",
			"Content-Type: text/html",
			"",
			"<html/>",
			"--FOLDED--",
		].join("\r\n");
		const result = splitMultipart(source);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value).toHaveLength(1);
			expect(result.value[0]?.body).toBe("<html/>");
		}
	});

	it("accepts boundary without quotes", () => {
		const source = fixture([
			"Content-Type: multipart/related; boundary=FOO",
			"",
			"--FOO",
			"Content-Type: text/plain",
			"",
			"hi",
			"--FOO--",
		]);
		const result = splitMultipart(source);
		expect(isOk(result)).toBe(true);
	});

	it("returns MhtmlBoundaryMissing when Content-Type is non-multipart", () => {
		const source = fixture(["Content-Type: text/plain", "", "nope"]);
		const result = splitMultipart(source);
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(hasCode(result.error, ErrorCode.MhtmlBoundaryMissing)).toBe(true);
		}
	});

	it("returns MhtmlBoundaryMissing when Content-Type header is absent", () => {
		const source = fixture(["", "body without any headers"]);
		const result = splitMultipart(source);
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(hasCode(result.error, ErrorCode.MhtmlBoundaryMissing)).toBe(true);
			if (hasCode(result.error, ErrorCode.MhtmlBoundaryMissing)) {
				expect(result.error.context["contentType"]).toBeNull();
			}
		}
	});

	it("returns MhtmlBoundaryMissing when multipart but no boundary param", () => {
		const source = fixture(["Content-Type: multipart/related", "", "noop"]);
		const result = splitMultipart(source);
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(hasCode(result.error, ErrorCode.MhtmlBoundaryMissing)).toBe(true);
		}
	});

	it("preserves header folding across continuation lines", () => {
		const source = fixture([
			'Content-Type: multipart/related; boundary="X"',
			"",
			"--X",
			"Content-Type: text/html;",
			" charset=UTF-8",
			"",
			"hi",
			"--X--",
		]);
		const result = splitMultipart(source);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value[0]?.headers.get("content-type")).toBe(
				"text/html; charset=UTF-8",
			);
		}
	});

	it("returns empty array when there are no parts between boundaries", () => {
		const source = fixture([
			'Content-Type: multipart/related; boundary="X"',
			"",
			"--X--",
		]);
		const result = splitMultipart(source);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value).toHaveLength(0);
		}
	});

	it("ignores lines with no ':' in the header block", () => {
		const source = fixture([
			'Content-Type: multipart/related; boundary="X"',
			"Garbage-Line-Without-Colon",
			"",
			"--X",
			"Content-Type: text/plain",
			"",
			"ok",
			"--X--",
		]);
		const result = splitMultipart(source);
		expect(isOk(result)).toBe(true);
	});

	it("handles source without a closing boundary gracefully", () => {
		const source = fixture([
			'Content-Type: multipart/related; boundary="X"',
			"",
			"--X",
			"Content-Type: text/plain",
			"",
			"body",
		]);
		const result = splitMultipart(source);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value).toHaveLength(1);
		}
	});

	it("ignores a line that begins with ':' in the header block", () => {
		const source = fixture([
			'Content-Type: multipart/related; boundary="X"',
			":invalid-header",
			"",
			"--X",
			"Content-Type: text/plain",
			"",
			"ok",
			"--X--",
		]);
		const result = splitMultipart(source);
		expect(isOk(result)).toBe(true);
	});

	it("ignores continuation lines that have no preceding key", () => {
		const source = fixture([
			" orphan-continuation",
			'Content-Type: multipart/related; boundary="X"',
			"",
			"--X",
			"Content-Type: text/plain",
			"",
			"ok",
			"--X--",
		]);
		const result = splitMultipart(source);
		expect(isOk(result)).toBe(true);
	});
});
