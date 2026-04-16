/**
 * テキストの前処理レイヤ。全角/半角、ローマ数字、装飾記号、不可視文字、制御文字
 * などによる表記ゆれや攻撃面を境界で一律に塞ぐ。
 *
 * - `canonicalize(raw)`     保存・表示用。NFKC + 不可視文字除去 + 制御文字除去
 * - `sanitizeLine(raw)`     ユーザー入力 1 行用。canonicalize + 改行折り畳み + 長さ制限
 * - `matchKey(raw)`         文字列マッチ用。canonicalize + 装飾記号除去 + 空白除去 + 小文字化
 */

const ZERO_WIDTH_RE = /[\u200B-\u200D\u2060\uFEFF]/g;
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally targets C0/C1 control characters for sanitization
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F]/g;
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally targets non-newline control characters for sanitization
const NON_NEWLINE_CONTROL_RE = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;
const DECORATIVE_MARKERS_RE = /[※★☆◆◇◎§¶†‡]/g;
const WHITESPACE_RE = /\s+/g;
const LINE_BREAK_RE = /[\r\n]+/g;

export const DEFAULT_MAX_INLINE_LENGTH = 200;

export const canonicalize = (input: string): string =>
	input
		.normalize("NFKC")
		.replace(ZERO_WIDTH_RE, "")
		.replace(CONTROL_CHARS_RE, (ch) =>
			ch === "\n" || ch === "\r" || ch === "\t" ? ch : "",
		);

/**
 * ユーザー入力のフィールド 1 行を安全に取り回せる形にする。
 * 複数行改行は空白 1 つに畳み、先頭末尾の空白を除去、最大長を超えたら切り詰める。
 */
export const sanitizeLine = (
	input: string,
	maxLength: number = DEFAULT_MAX_INLINE_LENGTH,
): string =>
	canonicalize(input)
		.replace(NON_NEWLINE_CONTROL_RE, "")
		.replace(LINE_BREAK_RE, " ")
		.replace(WHITESPACE_RE, " ")
		.trim()
		.slice(0, maxLength);

/**
 * 文字列比較（カテゴリ名のマッチ等）に使うキー。装飾記号・空白・大小差を潰す。
 * 表示には使わない（情報を落とすため）。
 */
export const matchKey = (input: string): string =>
	canonicalize(input)
		.replace(DECORATIVE_MARKERS_RE, "")
		.replace(WHITESPACE_RE, "")
		.toLowerCase();
