import type { DomainError } from "../../domain/errors/domain-error.ts";
import type { Result } from "../../domain/errors/result.ts";

export interface RawCourse {
	readonly rawCategoryLabel: string;
	readonly name: string;
	readonly creditText: string;
	readonly gradeText: string;
	readonly yearText?: string;
	readonly teacher?: string;
	readonly scoreText?: string;
	readonly courseCode?: string;
}

/**
 * 統一パーサインタフェース。入力は生バイト（Uint8Array）に統一し、
 * 各実装が内部で decode / 解析する。
 *   - MHTML 実装は UTF-8 文字列として decode してから走査
 *   - PDF 実装は pdfjs-dist にバイトを渡して getTextContent() を取る
 * async にしているのは PDF パースが本質的に非同期（pdfjs-dist / Worker）なため。
 */
export interface TranscriptParser {
	parse(
		bytes: Uint8Array,
	): Promise<Result<readonly RawCourse[], DomainError>>;
}

/** 文字列をパーサに渡すときのヘルパー（テスト便利用）。 */
export const encodeSource = (text: string): Uint8Array =>
	new TextEncoder().encode(text);
