import { DomainError } from "../../domain/errors/domain-error.ts";
import { ErrorCode } from "../../domain/errors/error-code.ts";
import { err, type Result } from "../../domain/errors/result.ts";
import { detectTranscriptFormat } from "./detect-format.ts";
import { mhtmlParser } from "./mhtml/mhtml-parser.ts";
import { pdfParser } from "./pdf/pdf-parser.ts";
import type { RawCourse, TranscriptParser } from "./transcript-parser.ts";

/**
 * 先頭バイトで PDF / MHTML を判別し、対応するパーサにディスパッチする。
 * ユーザーは拡張子・ファイル名を気にせずドロップできる。
 */
export const createAutoParser = (options: {
	readonly pdf: TranscriptParser;
	readonly mhtml: TranscriptParser;
}): TranscriptParser => ({
	async parse(
		bytes: Uint8Array,
	): Promise<Result<readonly RawCourse[], DomainError>> {
		const format = detectTranscriptFormat(bytes);
		switch (format) {
			case "pdf":
				return options.pdf.parse(bytes);
			case "mhtml":
				return options.mhtml.parse(bytes);
			case "unknown":
				return err(
					new DomainError({
						code: ErrorCode.UnsupportedFileFormat,
						message: "Could not detect PDF or MHTML from leading bytes",
						userMessage:
							"PDF か MHTML を認識できませんでした。高知大学「個別成績表」の PDF、もしくは「成績閲覧」画面を保存した MHTML をドロップしてください。",
						context: { byteLength: bytes.byteLength },
					}),
				);
		}
	},
});

export const autoParser: TranscriptParser = createAutoParser({
	pdf: pdfParser,
	mhtml: mhtmlParser,
});
