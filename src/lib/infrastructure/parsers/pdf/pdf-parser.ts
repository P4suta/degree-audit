import { DomainError } from "../../../domain/errors/domain-error.ts";
import { ErrorCode } from "../../../domain/errors/error-code.ts";
import { err, ok, type Result } from "../../../domain/errors/result.ts";
import type { RawCourse, TranscriptParser } from "../transcript-parser.ts";
import { extractRawCoursesFromPages } from "./row-extractor.ts";
import {
	extractPositionedText,
	type PdfDocumentLoader,
} from "./text-extractor.ts";

/**
 * PDF ソースサイズ上限。ページ数が膨らんでも個別成績表は 1〜3MB 程度で十分。
 * 超過時は即座に DomainError で弾く。
 */
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

/**
 * pdfjs-dist を遅延ロードするデフォルトの loader。
 * アプリコードパスでしか import されないので、SSR / prerender と
 * Worker どちらからも安全に使える。
 */
const defaultLoader: PdfDocumentLoader = {
	async load(bytes) {
		const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
		// Worker 化する時はここで workerSrc を設定する。
		// Node / Bun 環境では fake worker が内部で立ち上がる。
		return pdfjs.getDocument({
			data: bytes,
			isEvalSupported: false,
			useSystemFonts: false,
			disableFontFace: true,
		}).promise;
	},
};

const assertSize = (bytes: Uint8Array): Result<Uint8Array, DomainError> => {
	if (bytes.byteLength > MAX_PDF_BYTES) {
		return err(
			new DomainError({
				code: ErrorCode.PdfSourceTooLarge,
				message: `PDF source exceeds ${MAX_PDF_BYTES} bytes (${bytes.byteLength})`,
				userMessage:
					"PDF が大きすぎます。別のファイルを試すか、学務システムから再ダウンロードしてください。",
				context: { size: bytes.byteLength, limit: MAX_PDF_BYTES },
			}),
		);
	}
	return ok(bytes);
};

const assertSomeCourses = (
	rows: readonly RawCourse[],
): Result<readonly RawCourse[], DomainError> => {
	if (rows.length === 0) {
		return err(
			new DomainError({
				code: ErrorCode.PdfNoCoursesFound,
				message: "PDF parsed but no course rows were extracted",
				userMessage:
					"PDF は読めましたが、科目の行が 1 件も見つかりませんでした。高知大学「個別成績表」の PDF かご確認ください。",
			}),
		);
	}
	return ok(rows);
};

export const createPdfParser = (
	loader: PdfDocumentLoader = defaultLoader,
): TranscriptParser => ({
	async parse(bytes) {
		const sized = assertSize(bytes);
		if (sized.ok === false) return sized;
		try {
			const pages = await extractPositionedText(loader, sized.value);
			const raws = extractRawCoursesFromPages(pages);
			return assertSomeCourses(raws);
		} catch (cause) {
			return err(
				new DomainError({
					code: ErrorCode.PdfDecodingFailed,
					message: "pdfjs-dist failed to decode the PDF",
					userMessage:
						"PDF の解析に失敗しました。ファイルが壊れていないか、またブラウザが対応している PDF 形式かご確認ください。",
					context: { byteLength: bytes.byteLength },
					cause,
				}),
			);
		}
	},
});

export const pdfParser: TranscriptParser = createPdfParser();
