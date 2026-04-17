import { DomainError } from "../../domain/errors/domain-error.ts";
import { ErrorCode } from "../../domain/errors/error-code.ts";
import { err, type Result } from "../../domain/errors/result.ts";
import { detectTranscriptFormat } from "./detect-format.ts";
import { mhtmlParser } from "./mhtml/mhtml-parser.ts";
import { textParser } from "./text/text-parser.ts";
import type { RawCourse, TranscriptParser } from "./transcript-parser.ts";

/**
 * 先頭バイトで成績ページのコピペテキスト / MHTML を判別し、対応するパーサに
 * ディスパッチする。ユーザーは拡張子・ファイル名を気にせずドロップ / ペースト
 * できる。
 */
export const createAutoParser = (options: {
	readonly mhtml: TranscriptParser;
	readonly text: TranscriptParser;
}): TranscriptParser => ({
	async parse(
		bytes: Uint8Array,
	): Promise<Result<readonly RawCourse[], DomainError>> {
		const format = detectTranscriptFormat(bytes);
		switch (format) {
			case "mhtml":
				return options.mhtml.parse(bytes);
			case "text":
				return options.text.parse(bytes);
			case "unknown":
				return err(
					new DomainError({
						code: ErrorCode.UnsupportedFileFormat,
						message: "Could not detect MHTML / text paste from leading bytes",
						userMessage:
							"成績ページのコピペ、もしくは MHTML として認識できませんでした。成績ページからコピーしたテキストを貼り付けるか、MHTML ファイルをドロップしてください。",
						context: { byteLength: bytes.byteLength },
					}),
				);
		}
	},
});

export const autoParser: TranscriptParser = createAutoParser({
	mhtml: mhtmlParser,
	text: textParser,
});
