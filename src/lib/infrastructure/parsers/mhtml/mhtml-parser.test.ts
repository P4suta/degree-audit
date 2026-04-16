// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { ErrorCode } from "../../../domain/errors/error-code.ts";
import { hasCode } from "../../../domain/errors/guards.ts";
import { isErr, isOk } from "../../../domain/errors/result.ts";
import { mhtmlParser } from "./mhtml-parser.ts";

const buildMhtml = (htmlBody: string, boundary = "BOUNDARY"): string =>
	[
		`Content-Type: multipart/related; boundary="${boundary}"`,
		"",
		`--${boundary}`,
		"Content-Type: text/html; charset=UTF-8",
		"Content-Transfer-Encoding: 8bit",
		"",
		htmlBody,
		`--${boundary}--`,
	].join("\r\n");

describe("mhtmlParser.parse", () => {
	it("extracts courses from a minimal MHTML document", () => {
		const html = `<!doctype html><html><body>
			<table>
				<tr><th>科目分類</th><th>履修科目</th><th>単位数</th><th>成績評価</th></tr>
				<tr><td>共通教育 初年次</td><td>大学基礎論</td><td>2</td><td>優</td></tr>
			</table>
		</body></html>`;
		const result = mhtmlParser.parse(buildMhtml(html));
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value).toHaveLength(1);
			expect(result.value[0]?.name).toBe("大学基礎論");
		}
	});

	it("returns MhtmlTableExtractionFailed when no text/html part exists", () => {
		const source = [
			'Content-Type: multipart/related; boundary="X"',
			"",
			"--X",
			"Content-Type: image/png",
			"",
			"binary-blob",
			"--X--",
		].join("\r\n");
		const result = mhtmlParser.parse(source);
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(hasCode(result.error, ErrorCode.MhtmlTableExtractionFailed)).toBe(
				true,
			);
		}
	});

	it("returns MhtmlBoundaryMissing when top-level header has no boundary", () => {
		const result = mhtmlParser.parse("Content-Type: text/plain\r\n\r\nhi");
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(hasCode(result.error, ErrorCode.MhtmlBoundaryMissing)).toBe(true);
		}
	});

	it("rejects an MHTML source that exceeds the byte limit", () => {
		const huge = "x".repeat(21 * 1024 * 1024);
		const result = mhtmlParser.parse(huge);
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(hasCode(result.error, ErrorCode.MhtmlSourceTooLarge)).toBe(true);
		}
	});

	it("rejects an MHTML where no course rows were extracted", () => {
		const html = `<!doctype html><html><body>
			<table>
				<tr><th>履修科目</th><th>単位</th><th>成績</th></tr>
			</table>
		</body></html>`;
		const result = mhtmlParser.parse(buildMhtml(html));
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(hasCode(result.error, ErrorCode.MhtmlNoCoursesFound)).toBe(true);
		}
	});

	it("skips parts that lack a content-type header when searching for HTML", () => {
		const source = [
			'Content-Type: multipart/related; boundary="X"',
			"",
			"--X",
			"",
			"orphan body",
			"--X",
			"Content-Type: image/png",
			"",
			"nothtml",
			"--X--",
		].join("\r\n");
		const result = mhtmlParser.parse(source);
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(hasCode(result.error, ErrorCode.MhtmlTableExtractionFailed)).toBe(
				true,
			);
		}
	});
});
