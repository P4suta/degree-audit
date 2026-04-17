import { describe, expect, it } from "vitest";
import { DomainError } from "../../domain/errors/domain-error.ts";
import { ErrorCode } from "../../domain/errors/error-code.ts";
import { err, ok } from "../../domain/errors/result.ts";
import type { RawCourse } from "../parsers/transcript-parser.ts";
import {
	deserializeError,
	deserializeResult,
	serializeError,
	serializeResult,
} from "./transcript-protocol.ts";

const sample: RawCourse = {
	rawCategoryLabel: "共通教育 / 初年次科目",
	name: "大学基礎論",
	creditText: "2",
	gradeText: "優",
	yearText: "22",
	teacher: "田鎖 数馬",
	scoreText: "86",
};

describe("transcript protocol serialization", () => {
	it("round-trips an ok result through serialize/deserialize", () => {
		const wire = serializeResult(ok([sample] as readonly RawCourse[]));
		expect(wire.ok).toBe(true);
		const after = deserializeResult(wire);
		expect(after.ok).toBe(true);
		if (after.ok) expect(after.value).toEqual([sample]);
	});

	it("round-trips an err result preserving code / userMessage / context", () => {
		const original = new DomainError({
			code: ErrorCode.PdfDecodingFailed,
			message: "boom",
			userMessage: "ユーザー向け",
			context: { byteLength: 1234 },
		});
		const wire = serializeResult(err(original));
		expect(wire.ok).toBe(false);
		const after = deserializeResult(wire);
		expect(after.ok).toBe(false);
		if (!after.ok) {
			expect(after.error).toBeInstanceOf(DomainError);
			expect(after.error.code).toBe(ErrorCode.PdfDecodingFailed);
			expect(after.error.userMessage).toBe("ユーザー向け");
			expect(after.error.context).toEqual({ byteLength: 1234 });
		}
	});

	it("drops un-serializable context fields but keeps the rest", () => {
		const circular: Record<string, unknown> = { a: 1 };
		circular["self"] = circular;
		const original = new DomainError({
			code: ErrorCode.MhtmlBoundaryMissing,
			message: "x",
			userMessage: "y",
			context: circular,
		});
		const wire = serializeError(original);
		// Circular reference should make JSON serialization fail → context dropped
		expect(wire.context).toBeUndefined();
		const rebuilt = deserializeError(wire);
		expect(rebuilt.code).toBe(ErrorCode.MhtmlBoundaryMissing);
		expect(rebuilt.userMessage).toBe("y");
	});
});
