export type TranscriptFormat = "pdf" | "mhtml" | "unknown";

/**
 * 先頭バイトで transcript のフォーマットを判別する。
 *
 * - PDF: マジックバイト `%PDF-` から始まる
 * - MHTML: multipart メッセージ（`MIME-Version:` / `Content-Type: multipart/related`
 *   / `From: ` 等で始まる）。BOM や先頭空白には寛容
 * - それ以外は unknown（UI 側で拒否）
 *
 * 解析に失敗したときのユーザー体験を守るため、拡張子やファイル名には
 * 依存せずに中身だけで判定する。
 */
const PDF_MAGIC = "%PDF-";

const MHTML_HEADS = [
	"MIME-Version:",
	"Content-Type: multipart/related",
	"Content-Type: multipart/",
	"From:",
	"Subject:",
] as const;

const stripLeadingWhitespaceAndBom = (text: string): string =>
	text.replace(/^\uFEFF/, "").replace(/^[\s\r\n]+/, "");

export const detectTranscriptFormat = (bytes: Uint8Array): TranscriptFormat => {
	if (bytes.byteLength === 0) return "unknown";
	// 先頭 512 バイトだけ見れば十分
	const head = new TextDecoder("utf-8", { fatal: false }).decode(
		bytes.subarray(0, Math.min(512, bytes.byteLength)),
	);
	const cleaned = stripLeadingWhitespaceAndBom(head);
	if (cleaned.startsWith(PDF_MAGIC)) return "pdf";
	// MHTML は先頭数行以内に識別ヘッダがある
	const firstChunk = cleaned.slice(0, 300);
	for (const head of MHTML_HEADS) {
		if (firstChunk.toLowerCase().startsWith(head.toLowerCase())) return "mhtml";
	}
	// 予防的: MHTML は行中にもヘッダが出るので許容範囲を少し広げる
	const lowered = firstChunk.toLowerCase();
	if (
		lowered.includes("content-type: multipart/related") ||
		lowered.includes("content-type: multipart/")
	) {
		return "mhtml";
	}
	return "unknown";
};
