// Boundary text preprocessing: fold width/Roman-numeral/invisible/control-char
// variance. `canonicalize` for storage/display, `sanitizeLine` for one line of
// user input.

const ZERO_WIDTH_RE = /[\u200B-\u200D\u2060\uFEFF]/g;
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally targets C0/C1 control characters for sanitization
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F]/g;
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally targets non-newline control characters for sanitization
const NON_NEWLINE_CONTROL_RE = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;
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
 * Make one field/line of user input safe: fold line breaks to a single space,
 * collapse whitespace, trim, and cap the length.
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
