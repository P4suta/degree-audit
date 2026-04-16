// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { isErr, isOk } from "../../../domain/errors/result.ts";
import { extractRawCoursesFromHtml } from "./table-extractor.ts";

const html = (body: string) =>
	`<!doctype html><html><body>${body}</body></html>`;

describe("extractRawCoursesFromHtml", () => {
	it("assembles a category breadcrumb from hierarchical header rows", () => {
		const body = `
			<table>
				<tr><th>学則科目名称</th><th>単位</th><th>評価</th><th>成績 確定年度</th><th>教員名称</th></tr>
				<tr><td>共通教育</td><td></td><td></td><td></td><td></td></tr>
				<tr><td>初年次科目</td><td></td><td></td><td></td><td></td></tr>
				<tr><td>大学基礎論</td><td>2</td><td>優</td><td>2023</td><td>山田</td></tr>
				<tr><td>教養科目</td><td></td><td></td><td></td><td></td></tr>
				<tr><td>人文分野</td><td></td><td></td><td></td><td></td></tr>
				<tr><td>進化論の哲学</td><td>2</td><td>良</td><td>2023</td><td>原崎</td></tr>
			</table>
		`;
		const result = extractRawCoursesFromHtml(html(body));
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value).toHaveLength(2);
			expect(result.value[0]?.rawCategoryLabel).toBe("共通教育 / 初年次科目");
			expect(result.value[1]?.rawCategoryLabel).toBe(
				"共通教育 / 教養科目 / 人文分野",
			);
		}
	});

	it("resets the section when a new top-level token appears", () => {
		const body = `
			<table>
				<tr><th>学則科目名称</th><th>単位</th><th>評価</th></tr>
				<tr><td>共通教育</td><td></td><td></td></tr>
				<tr><td>初年次科目</td><td></td><td></td></tr>
				<tr><td>A</td><td>2</td><td>優</td></tr>
				<tr><td>選択科目</td><td></td><td></td></tr>
				<tr><td>他学部</td><td></td><td></td></tr>
				<tr><td>B</td><td>2</td><td>秀</td></tr>
			</table>
		`;
		const result = extractRawCoursesFromHtml(html(body));
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value[0]?.rawCategoryLabel).toBe("共通教育 / 初年次科目");
			expect(result.value[1]?.rawCategoryLabel).toBe("選択科目 / 他学部");
		}
	});

	it("deduplicates rows that appear in multiple tables", () => {
		const row = `
			<tr><th>学則科目名称</th><th>単位</th><th>評価</th><th>成績 確定年度</th></tr>
			<tr><td>共通教育</td><td></td><td></td><td></td></tr>
			<tr><td>初年次科目</td><td></td><td></td><td></td></tr>
			<tr><td>大学基礎論</td><td>2</td><td>優</td><td>2022</td></tr>
		`;
		const body = `<table>${row}</table><table>${row}</table>`;
		const result = extractRawCoursesFromHtml(html(body));
		expect(isOk(result) && result.value).toHaveLength(1);
	});

	it("skips tables whose header has none of the required columns", () => {
		const body = `
			<table><tr><th>foo</th><th>bar</th></tr><tr><td>1</td><td>2</td></tr></table>
			<table>
				<tr><th>科目名</th><th>単位</th><th>成績</th></tr>
				<tr><td>A</td><td>2</td><td>優</td></tr>
			</table>
		`;
		const result = extractRawCoursesFromHtml(html(body));
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value).toHaveLength(1);
			expect(result.value[0]?.name).toBe("A");
		}
	});

	it("falls back to the course name when no breadcrumb is accumulated", () => {
		const body = `
			<table>
				<tr><th>科目名</th><th>単位</th><th>成績</th></tr>
				<tr><td>物理学</td><td>2</td><td>優</td></tr>
			</table>
		`;
		const result = extractRawCoursesFromHtml(html(body));
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value[0]?.rawCategoryLabel).toBe("物理学");
		}
	});

	it("skips rows where name or credit is missing (non-header empty rows)", () => {
		const body = `
			<table>
				<tr><th>科目名</th><th>単位</th><th>成績</th></tr>
				<tr><td></td><td>2</td><td>優</td></tr>
				<tr><td>Y</td><td>2</td><td>優</td></tr>
			</table>
		`;
		const result = extractRawCoursesFromHtml(html(body));
		expect(isOk(result) && result.value).toHaveLength(1);
	});

	it("returns [] for HTML without any tables", () => {
		const result = extractRawCoursesFromHtml(html("<p>no tables</p>"));
		expect(isOk(result) && result.value).toHaveLength(0);
	});

	it("gracefully handles tables with just a header row", () => {
		const body = `<table><tr><th>科目名</th><th>単位</th><th>成績</th></tr></table>`;
		const result = extractRawCoursesFromHtml(html(body));
		expect(isOk(result) && result.value).toHaveLength(0);
	});

	it("returns MhtmlTableExtractionFailed when DOMParser throws", () => {
		// biome-ignore lint/suspicious/noExplicitAny: test-only shim
		const original = (globalThis as any).DOMParser;
		// biome-ignore lint/suspicious/noExplicitAny: test-only shim
		(globalThis as any).DOMParser = class {
			parseFromString() {
				throw new Error("synthetic failure");
			}
		};
		try {
			const result = extractRawCoursesFromHtml("<html/>");
			expect(isErr(result)).toBe(true);
		} finally {
			// biome-ignore lint/suspicious/noExplicitAny: test-only shim
			(globalThis as any).DOMParser = original;
		}
	});

	it("captures score and courseCode columns when present", () => {
		const body = `
			<table>
				<tr>
					<th>科目コード</th><th>科目名</th><th>単位</th><th>成績</th>
					<th>素点</th>
				</tr>
				<tr><td>K81001</td><td>物理学</td><td>2</td><td>優</td><td>85</td></tr>
			</table>
		`;
		const result = extractRawCoursesFromHtml(html(body));
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value[0]?.courseCode).toBe("K81001");
			expect(result.value[0]?.scoreText).toBe("85");
		}
	});

	it("skips tables with no rows at all", () => {
		const body = `<table></table>`;
		const result = extractRawCoursesFromHtml(html(body));
		expect(isOk(result) && result.value).toHaveLength(0);
	});

	it("leaves teacher undefined when the row does not provide that column", () => {
		const body = `
			<table>
				<tr><th>科目名</th><th>単位</th><th>成績</th><th>担当教員</th></tr>
				<tr><td>A</td><td>2</td><td>優</td></tr>
			</table>
		`;
		const result = extractRawCoursesFromHtml(html(body));
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value[0]?.teacher).toBeUndefined();
		}
	});
});
