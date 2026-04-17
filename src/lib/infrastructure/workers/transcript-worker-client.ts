import { browser } from "$app/environment";
import { DomainError } from "../../domain/errors/domain-error.ts";
import { ErrorCode } from "../../domain/errors/error-code.ts";
import { err, type Result } from "../../domain/errors/result.ts";
import { createAutoParser } from "../parsers/auto-parser.ts";
import { mhtmlParser } from "../parsers/mhtml/mhtml-parser.ts";
import { pdfParser } from "../parsers/pdf/pdf-parser.ts";
import type {
	RawCourse,
	TranscriptParser,
} from "../parsers/transcript-parser.ts";
import type { ParseRequest, ParseResponse } from "./transcript-protocol.ts";
import { deserializeResult } from "./transcript-protocol.ts";

/**
 * PDF パース専用の Worker クライアント。
 *
 * MDN / Vite 推奨パターンに準拠：
 *   - `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`
 *     を静的解析可能な形式で書き、Vite の worker ハンドリングに乗せる
 *   - SSR / prerender 中は構築しない（`$app/environment` の `browser` でガード）
 *   - `error` と `messageerror` の両方を監視し、壊れたら terminate → 次回
 *     メインスレッド fallback（pdfParser を直接呼ぶ）へ降格
 *   - タイムアウトは Promise.race で 60s、超過時もユーザーに返す
 *
 * 入れ子 Worker を避けるため、pdfjs-dist は Worker 内部で LoopbackPort
 * モード（`workerSrc` 未設定）で動く — Safari <16.4 の nested worker 非対応
 * 問題を回避。
 */

let workerInstance: Worker | null = null;

const getOrCreateWorker = (): Worker | null => {
	if (workerInstance !== null) return workerInstance;
	if (!browser) return null;
	try {
		const worker = new Worker(
			new URL("./transcript-worker.ts", import.meta.url),
			{ type: "module" },
		);
		const disposeOnFailure = () => {
			worker.terminate();
			if (workerInstance === worker) workerInstance = null;
		};
		worker.addEventListener("error", disposeOnFailure);
		worker.addEventListener("messageerror", disposeOnFailure);
		workerInstance = worker;
		return worker;
	} catch {
		return null;
	}
};

/** テスト・HMR クリーンアップ用。 */
export const disposeTranscriptWorker = (): void => {
	workerInstance?.terminate();
	workerInstance = null;
};

const TIMEOUT_MS = 60_000;

const nextId = (() => {
	let counter = 0;
	return () => `req-${++counter}`;
})();

const parseViaWorker = (
	worker: Worker,
	bytes: Uint8Array,
): Promise<Result<readonly RawCourse[], DomainError>> =>
	new Promise((resolve) => {
		const id = nextId();
		let settled = false;
		const finish = (result: Result<readonly RawCourse[], DomainError>) => {
			if (settled) return;
			settled = true;
			worker.removeEventListener("message", onMessage);
			worker.removeEventListener("error", onError);
			worker.removeEventListener("messageerror", onError);
			clearTimeout(timer);
			resolve(result);
		};
		const onMessage = (event: MessageEvent<ParseResponse>) => {
			const message = event.data;
			if (message?.type !== "parse-result" || message.id !== id) return;
			finish(deserializeResult(message.result));
		};
		const onError = () => {
			finish(
				err(
					new DomainError({
						code: ErrorCode.WorkerTranscriptFailed,
						message: "Transcript worker raised an error event",
						userMessage:
							"成績ファイルの解析中にエラーが発生しました。ページを再読み込みして再試行してください。",
						context: { requestId: id },
					}),
				),
			);
		};
		const timer = setTimeout(() => {
			finish(
				err(
					new DomainError({
						code: ErrorCode.WorkerTranscriptFailed,
						message: `Transcript worker did not respond within ${TIMEOUT_MS} ms`,
						userMessage:
							"成績の解析が応答しませんでした。時間をおいて再試行してください。",
						context: { requestId: id, timeoutMs: TIMEOUT_MS },
					}),
				),
			);
		}, TIMEOUT_MS);

		worker.addEventListener("message", onMessage);
		worker.addEventListener("error", onError);
		worker.addEventListener("messageerror", onError);

		try {
			const request: ParseRequest = { type: "parse", id, bytes };
			// ArrayBuffer を transfer してゼロコピーで渡す。呼び出し元は
			// この bytes を transfer 後に再利用しない前提
			worker.postMessage(request, [bytes.buffer]);
		} catch (cause) {
			finish(
				err(
					new DomainError({
						code: ErrorCode.WorkerTranscriptFailed,
						message: "postMessage to transcript worker failed",
						userMessage:
							"成績ファイルの送信に失敗しました。ページを再読み込みして再試行してください。",
						context: { byteLength: bytes.byteLength },
						cause,
					}),
				),
			);
		}
	});

/**
 * PDF 専用の worker-backed TranscriptParser。
 * Worker が使えない環境（SSR / Worker 非対応）ではメインスレッド `pdfParser`
 * へフォールバック。
 */
export const workerPdfParser: TranscriptParser = {
	async parse(bytes: Uint8Array) {
		const worker = getOrCreateWorker();
		if (worker === null) return pdfParser.parse(bytes);
		return parseViaWorker(worker, bytes);
	},
};

/**
 * メインスレッド上の統合パーサ（UI から使う想定）。
 *   - PDF → Worker（UI ブロックしない）
 *   - MHTML → メインスレッド（DOMParser 依存のため。`yieldToMain` で
 *     レンダリングを一度譲る工夫は呼び出し側で済み）
 */
export const workerBackedAutoParser: TranscriptParser = createAutoParser({
	pdf: workerPdfParser,
	mhtml: mhtmlParser,
});
