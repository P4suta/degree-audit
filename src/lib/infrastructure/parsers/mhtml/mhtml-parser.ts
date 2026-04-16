import { DomainError } from "../../../domain/errors/domain-error.ts";
import { ErrorCode } from "../../../domain/errors/error-code.ts";
import {
	err,
	flatMap,
	ok,
	type Result,
} from "../../../domain/errors/result.ts";
import type { RawCourse, TranscriptParser } from "../transcript-parser.ts";
import { decodePart } from "./decoding.ts";
import { findFirstPart, type MultipartPart } from "./multipart.ts";
import { extractRawCoursesFromHtml } from "./table-extractor.ts";

/**
 * MHTML のサイズ上限。実ファイルは 2〜3MB なので 20MB の余裕で切る。
 * 超過時はブラウザを固めないよう即座に DomainError で弾く。
 */
export const MAX_MHTML_BYTES = 20 * 1024 * 1024;

const isHtmlPart = (part: MultipartPart): boolean => {
	const contentType = part.headers.get("content-type");
	if (contentType === undefined) return false;
	return contentType.toLowerCase().includes("text/html");
};

const assertSourceSize = (source: string): Result<string, DomainError> => {
	const size = source.length;
	if (size > MAX_MHTML_BYTES) {
		return err(
			new DomainError({
				code: ErrorCode.MhtmlSourceTooLarge,
				message: `MHTML source exceeds the ${MAX_MHTML_BYTES} byte limit (${size})`,
				userMessage:
					"成績 MHTML が大きすぎます。ブラウザから再保存しなおして試してください。",
				context: { size, limit: MAX_MHTML_BYTES },
			}),
		);
	}
	return ok(source);
};

const ensureHtmlPart = (
	found: MultipartPart | undefined,
): Result<MultipartPart, DomainError> => {
	if (found === undefined) {
		return err(
			new DomainError({
				code: ErrorCode.MhtmlTableExtractionFailed,
				message: "No text/html part found in MHTML",
				userMessage: "MHTML から HTML 本文を見つけられませんでした。",
			}),
		);
	}
	return ok(found);
};

const assertSomeCourses = (
	rows: readonly RawCourse[],
): Result<readonly RawCourse[], DomainError> => {
	if (rows.length === 0) {
		return err(
			new DomainError({
				code: ErrorCode.MhtmlNoCoursesFound,
				message: "MHTML parsed successfully but no course rows were extracted",
				userMessage:
					"MHTML は読めましたが、科目の行が 1 件も見つかりませんでした。保存し直した成績画面 MHTML か確認してください。",
			}),
		);
	}
	return ok(rows);
};

export const mhtmlParser: TranscriptParser = {
	parse(source: string): Result<readonly RawCourse[], DomainError> {
		const sized = assertSourceSize(source);
		const firstHtmlPart = flatMap(sized, (src) =>
			findFirstPart(src, isHtmlPart),
		);
		const htmlPart = flatMap(firstHtmlPart, ensureHtmlPart);
		const decoded = flatMap(htmlPart, decodePart);
		const extracted = flatMap(decoded, extractRawCoursesFromHtml);
		return flatMap(extracted, assertSomeCourses);
	},
};
