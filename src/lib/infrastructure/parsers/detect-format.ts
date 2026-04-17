export type TranscriptFormat = "mhtml" | "text" | "unknown";

/**
 * 先頭バイトで transcript のフォーマットを判別する。
 *
 * - MHTML: multipart メッセージ（`MIME-Version:` / `Content-Type: multipart/related`
 *   / `From: ` 等で始まる）。BOM や先頭空白には寛容
 * - text: Kochi「Web 成績」コピペ。先頭 2KB に `学則科目名称` / `共通教育`
 *   / `専門科目` のいずれかを含む
 * - それ以外は unknown（UI 側で拒否）
 *
 * 解析に失敗したときのユーザー体験を守るため、拡張子やファイル名には
 * 依存せずに中身だけで判定する。
 */
const MHTML_HEADS = [
	"MIME-Version:",
	"Content-Type: multipart/related",
	"Content-Type: multipart/",
	"From:",
	"Subject:",
] as const;

const TEXT_SIGNALS = ["学則科目名称", "共通教育", "専門科目"] as const;

const stripLeadingWhitespaceAndBom = (text: string): string =>
	text.replace(/^\uFEFF/, "").replace(/^[\s\r\n]+/, "");

export const detectTranscriptFormat = (bytes: Uint8Array): TranscriptFormat => {
	if (bytes.byteLength === 0) return "unknown";
	// 先頭 2KB を見る（text 判定のため広めに確保）
	const head = new TextDecoder("utf-8", { fatal: false }).decode(
		bytes.subarray(0, Math.min(2048, bytes.byteLength)),
	);
	const cleaned = stripLeadingWhitespaceAndBom(head);
	// MHTML は先頭数行以内に識別ヘッダがある
	const firstChunk = cleaned.slice(0, 300);
	for (const h of MHTML_HEADS) {
		if (firstChunk.toLowerCase().startsWith(h.toLowerCase())) return "mhtml";
	}
	// 予防的: MHTML は行中にもヘッダが出るので許容範囲を少し広げる
	const lowered = firstChunk.toLowerCase();
	if (
		lowered.includes("content-type: multipart/related") ||
		lowered.includes("content-type: multipart/")
	) {
		return "mhtml";
	}
	// text: Kochi Web 成績コピペ
	for (const signal of TEXT_SIGNALS) {
		if (cleaned.includes(signal)) return "text";
	}
	return "unknown";
};
