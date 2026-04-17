import { describe, expect, it } from "vitest";
import {
	extractPositionedText,
	type PdfDocumentLoader,
} from "./text-extractor.ts";

const makeLoader = (items: readonly unknown[]): PdfDocumentLoader => ({
	async load() {
		return {
			numPages: 1,
			async getPage() {
				return {
					async getTextContent() {
						return {
							items: items as readonly {
								readonly str: string;
								readonly transform: readonly number[];
								readonly width: number;
							}[],
						};
					},
				};
			},
		};
	},
});

describe("extractPositionedText defensive paths", () => {
	it("skips non-text items (e.g., image placeholders with only `type`)", async () => {
		const loader = makeLoader([
			{ type: "beginMarkedContent" },
			{ str: "hello", transform: [1, 0, 0, 1, 10, 20], width: 5 },
		]);
		const pages = await extractPositionedText(loader, new Uint8Array());
		expect(pages[0]?.items).toHaveLength(1);
		expect(pages[0]?.items[0]?.str).toBe("hello");
	});

	it("skips empty-string items", async () => {
		const loader = makeLoader([
			{ str: "", transform: [1, 0, 0, 1, 10, 20], width: 0 },
			{ str: "ok", transform: [1, 0, 0, 1, 30, 40], width: 2 },
		]);
		const pages = await extractPositionedText(loader, new Uint8Array());
		expect(pages[0]?.items.map((i) => i.str)).toEqual(["ok"]);
	});

	it("defaults transform[4] / transform[5] to 0 when missing", async () => {
		const loader = makeLoader([
			// transform missing indices 4/5 → defaults to 0
			{ str: "edge", transform: [1, 0, 0, 1], width: 1 },
		]);
		const pages = await extractPositionedText(loader, new Uint8Array());
		expect(pages[0]?.items[0]?.x).toBe(0);
		expect(pages[0]?.items[0]?.y).toBe(0);
	});
});
