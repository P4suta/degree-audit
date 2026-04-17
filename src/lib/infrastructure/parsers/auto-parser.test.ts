import { describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../../domain/errors/error-code.ts";
import { hasCode } from "../../domain/errors/guards.ts";
import { isErr, isOk, ok } from "../../domain/errors/result.ts";
import { createAutoParser } from "./auto-parser.ts";
import type { RawCourse, TranscriptParser } from "./transcript-parser.ts";

const enc = new TextEncoder();

const stubRaw = (name: string): RawCourse => ({
	rawCategoryLabel: "stub",
	name,
	creditText: "2",
	gradeText: "優",
});

const fakeParser = (label: string): TranscriptParser => ({
	parse: vi.fn(async () => ok([stubRaw(label)])),
});

describe("createAutoParser", () => {
	it("routes MHTML bytes to the MHTML parser", async () => {
		const mhtml = fakeParser("mhtml");
		const text = fakeParser("text");
		const auto = createAutoParser({ mhtml, text });
		const result = await auto.parse(
			enc.encode("MIME-Version: 1.0\r\nContent-Type: multipart/related\r\n"),
		);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) expect(result.value[0]?.name).toBe("mhtml");
		expect(mhtml.parse).toHaveBeenCalledTimes(1);
		expect(text.parse).not.toHaveBeenCalled();
	});

	it("routes text paste to the text parser", async () => {
		const mhtml = fakeParser("mhtml");
		const text = fakeParser("text");
		const auto = createAutoParser({ mhtml, text });
		const result = await auto.parse(
			enc.encode("共通教育\n初年次科目\n大学基礎論\t2\t86\t優\n"),
		);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) expect(result.value[0]?.name).toBe("text");
		expect(text.parse).toHaveBeenCalledTimes(1);
		expect(mhtml.parse).not.toHaveBeenCalled();
	});

	it("returns UnsupportedFileFormat for unknown bytes", async () => {
		const mhtml = fakeParser("mhtml");
		const text = fakeParser("text");
		const auto = createAutoParser({ mhtml, text });
		const result = await auto.parse(enc.encode("hello world"));
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(hasCode(result.error, ErrorCode.UnsupportedFileFormat)).toBe(true);
		}
		expect(mhtml.parse).not.toHaveBeenCalled();
		expect(text.parse).not.toHaveBeenCalled();
	});
});
