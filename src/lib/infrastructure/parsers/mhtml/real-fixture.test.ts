// @vitest-environment happy-dom
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isOk } from "../../../domain/errors/result.ts";
import { parseMhtmlSource } from "./mhtml-parser.ts";

const FIXTURE_PATH = "tests/fixtures/transcript.mhtml";

describe.skipIf(!existsSync(FIXTURE_PATH))(
	"mhtmlParser on real transcript fixture",
	() => {
		const source = existsSync(FIXTURE_PATH)
			? readFileSync(FIXTURE_PATH, "utf-8")
			: "";

		it("parses without errors", () => {
			const result = parseMhtmlSource(source);
			expect(isOk(result)).toBe(true);
		});

		it("extracts at least one course with the expected shape", () => {
			const result = parseMhtmlSource(source);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.value.length).toBeGreaterThan(0);
				const sample = result.value[0];
				expect(sample?.name).toBeTypeOf("string");
				expect(sample?.creditText).toBeTypeOf("string");
				expect(sample?.gradeText).toBeTypeOf("string");
			}
		});
	},
);
