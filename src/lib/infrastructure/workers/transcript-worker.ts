/// <reference lib="webworker" />

import { pdfParser } from "../parsers/pdf/pdf-parser.ts";
import type { ParseRequest, ParseResponse } from "./transcript-protocol.ts";
import { serializeResult } from "./transcript-protocol.ts";

/**
 * PDF 解析をメインスレッドから切り離す Dedicated Module Worker。
 *
 * 設計メモ（MDN / Vite 公式 / pdfjs-dist v5 に基づく）：
 *   - PDF 専用。MHTML は DOMParser が Worker 未対応ブラウザが残るため
 *     メインスレッドで扱う（呼び出し側の `workerBackedAutoParser` で分岐）
 *   - pdfjs は `GlobalWorkerOptions.workerSrc` を **設定しない**ことで
 *     LoopbackPort（fake-worker / 同スレッド）モードに落ちる。この Worker
 *     自身が pdfjs の重い処理を担うが、メインスレッドには影響しない。
 *     入れ子 Worker（Safari <16.4 の非対応ケース）を避けるための選択
 *   - プロトコルは `ParseRequest` / `ParseResponse`（`transcript-protocol.ts`）
 *     に基づく request-id ベースの非同期。structured clone の制限を避け
 *     るため DomainError は明示 serialize
 *
 *   main → worker: { type: "parse", id, bytes }
 *   worker → main: { type: "parse-result", id, result: SerializedResult }
 */

declare const self: DedicatedWorkerGlobalScope;

self.addEventListener("message", (event: MessageEvent<ParseRequest>) => {
	const message = event.data;
	if (message?.type !== "parse") return;
	void (async () => {
		try {
			const result = await pdfParser.parse(message.bytes);
			const response: ParseResponse = {
				type: "parse-result",
				id: message.id,
				result: serializeResult(result),
			};
			self.postMessage(response);
		} catch (cause) {
			// 予期せぬ throw — pdfParser 内部で拾いきれなかったもの。
			// プロトコル上は err Result として返し、main 側でユーザーに見せる
			const response: ParseResponse = {
				type: "parse-result",
				id: message.id,
				result: {
					ok: false,
					error: {
						kind: "DomainError",
						code: "DEGREE_AUDIT/WORKER/TRANSCRIPT_FAILED",
						message:
							cause instanceof Error ? cause.message : "worker parse failed",
						userMessage:
							"成績ファイルの解析に失敗しました。ページを再読み込みして再試行してください。",
						context: { byteLength: message.bytes.byteLength },
					},
				},
			};
			self.postMessage(response);
		}
	})();
});
