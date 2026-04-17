import { describe, expect, it } from "vitest";
import { extractRawCoursesFromPages } from "./row-extractor.ts";

describe("extractRawCoursesFromPages defensive paths", () => {
	it("ignores items outside any known field x-range (e.g., margin noise)", () => {
		// x=-50 に項目があっても fieldAt は undefined を返し、cell は作られない。
		// 行として成立しないので course も作られない。
		const pages = [
			{
				pageNumber: 1,
				items: [
					{ str: "noise", x: -50, y: 400, width: 1 },
					{ str: "another", x: 9000, y: 400, width: 1 },
				],
			},
		];
		const rows = extractRawCoursesFromPages(pages);
		expect(rows).toHaveLength(0);
	});

	it("returns empty array when all items are outside the data area (headers only)", () => {
		const pages = [
			{
				pageNumber: 1,
				items: [{ str: "title", x: 100, y: 750, width: 10 }],
			},
		];
		expect(extractRawCoursesFromPages(pages)).toHaveLength(0);
	});
});
