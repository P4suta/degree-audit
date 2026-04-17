import { describe, expect, it } from "vitest";
import { StudentProfile } from "../domain/entities/student-profile.ts";
import { DomainError } from "../domain/errors/domain-error.ts";
import { ErrorCode } from "../domain/errors/error-code.ts";
import { hasCode } from "../domain/errors/guards.ts";
import { err, isErr, isOk, ok } from "../domain/errors/result.ts";
import { defaultRuleSet } from "../domain/rulesets/default/index.ts";
import type {
	RawCourse,
	TranscriptParser,
} from "../infrastructure/parsers/transcript-parser.ts";
import { importTranscript } from "./import-transcript.ts";

const profile = (() => {
	const r = StudentProfile.parse({
		facultyId: "humanities",
		courseId: "philosophy",
		matriculationYear: 2022,
	});
	if (!isOk(r)) throw new Error("fixture");
	return r.value;
})();

const STUB_SOURCE = new TextEncoder().encode("<stub>");

const stubParser = (raws: readonly RawCourse[]): TranscriptParser => ({
	parse: async () => ok(raws),
});

const failingParser: TranscriptParser = {
	parse: async () =>
		err(
			new DomainError({
				code: ErrorCode.MhtmlBoundaryMissing,
				message: "boundary missing",
				userMessage: "境界がありません",
			}),
		),
};

const rawCourse = (overrides: Partial<RawCourse> = {}): RawCourse => ({
	rawCategoryLabel: "共通教育 初年次",
	name: "大学基礎論",
	creditText: "2",
	gradeText: "優",
	...overrides,
});

describe("importTranscript", () => {
	it("combines parser + mapper and builds an AcademicRecord", async () => {
		const parser = stubParser([
			rawCourse(),
			rawCourse({ name: "ゼミナールI", rawCategoryLabel: "ゼミナールI" }),
		]);
		const result = await importTranscript({
			source: STUB_SOURCE,
			parser,
			ruleSet: defaultRuleSet,
			profile,
		});
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value.record.courses).toHaveLength(2);
			expect(result.value.skipped).toHaveLength(0);
		}
	});

	it("propagates parser errors as DomainError", async () => {
		const result = await importTranscript({
			source: STUB_SOURCE,
			parser: failingParser,
			ruleSet: defaultRuleSet,
			profile,
		});
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(hasCode(result.error, ErrorCode.MhtmlBoundaryMissing)).toBe(true);
		}
	});

	it("returns skipped entries for malformed individual rows", async () => {
		const parser = stubParser([
			rawCourse({ name: "X", creditText: "bad" }),
			rawCourse({ name: "Y" }),
		]);
		const result = await importTranscript({
			source: STUB_SOURCE,
			parser,
			ruleSet: defaultRuleSet,
			profile,
		});
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value.record.courses).toHaveLength(1);
			expect(result.value.skipped).toHaveLength(1);
		}
	});

	it("rejects the import when every course maps to an unknown category", async () => {
		const parser = stubParser([
			rawCourse({ name: "謎科目A", rawCategoryLabel: "不明区分" }),
			rawCourse({ name: "謎科目B", rawCategoryLabel: "まったく不明" }),
		]);
		const result = await importTranscript({
			source: STUB_SOURCE,
			parser,
			ruleSet: defaultRuleSet,
			profile,
		});
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(hasCode(result.error, ErrorCode.ImportAllCategoriesUnknown)).toBe(
				true,
			);
		}
	});

	it("accepts a parsed transcript with zero rows without invoking the unknown-ratio guard", async () => {
		const result = await importTranscript({
			source: STUB_SOURCE,
			parser: stubParser([]),
			ruleSet: defaultRuleSet,
			profile,
		});
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value.record.courses).toHaveLength(0);
			expect(result.value.unknownCategoryCount).toBe(0);
		}
	});

	it("reports unknownCategoryCount on successful imports", async () => {
		const parser = stubParser([rawCourse()]);
		const result = await importTranscript({
			source: STUB_SOURCE,
			parser,
			ruleSet: defaultRuleSet,
			profile,
		});
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value.unknownCategoryCount).toBe(0);
		}
	});
});
