// @vitest-environment happy-dom
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isOk } from "../../domain/errors/result.ts";
import { workerBackedAutoParser } from "./transcript-worker-client.ts";

/**
 * テスト環境（Vitest node）では `$app/environment` の `browser` が false に
 * モックされるため、worker-backed パスはメインスレッド fallback に落ちる。
 * この fallback が正しく動作することを確認する（= PDF は main で pdfParser、
 * MHTML は main で mhtmlParser）。Worker 本体の挙動は実ブラウザでの手動検証。
 */
const PDF_FIXTURE = "tests/fixtures/transcript.pdf";
const MHTML_FIXTURE = "tests/fixtures/transcript.mhtml";

describe.skipIf(!existsSync(PDF_FIXTURE))(
	"workerBackedAutoParser main-thread fallback — PDF",
	() => {
		it("parses a PDF via the fallback to pdfParser", async () => {
			const bytes = new Uint8Array(readFileSync(PDF_FIXTURE));
			const result = await workerBackedAutoParser.parse(bytes);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) expect(result.value.length).toBeGreaterThan(0);
		});
	},
);

describe.skipIf(!existsSync(MHTML_FIXTURE))(
	"workerBackedAutoParser main-thread fallback — MHTML",
	() => {
		it("parses an MHTML via the fallback to mhtmlParser", async () => {
			const bytes = new Uint8Array(readFileSync(MHTML_FIXTURE));
			const result = await workerBackedAutoParser.parse(bytes);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) expect(result.value.length).toBeGreaterThan(0);
		});
	},
);
