import { DomainError } from "../../../domain/errors/domain-error.ts";
import { ErrorCode } from "../../../domain/errors/error-code.ts";
import { err, ok, type Result } from "../../../domain/errors/result.ts";

const QP_SOFT_LINE_BREAK = /=(?:\r?\n|\r)/g;

export const decodeQuotedPrintable = (
	input: string,
	charset = "utf-8",
): Result<string, DomainError> => {
	try {
		const withoutSoftBreaks = input.replace(QP_SOFT_LINE_BREAK, "");
		const bytes: number[] = [];
		let index = 0;
		while (index < withoutSoftBreaks.length) {
			const char = withoutSoftBreaks.charAt(index);
			if (char === "=") {
				const hex = withoutSoftBreaks.slice(index + 1, index + 3);
				if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
					bytes.push(Number.parseInt(hex, 16));
					index += 3;
					continue;
				}
			}
			bytes.push(char.charCodeAt(0));
			index += 1;
		}
		const decoder = new TextDecoder(charset);
		return ok(decoder.decode(new Uint8Array(bytes)));
	} catch (cause) {
		return err(
			new DomainError({
				code: ErrorCode.MhtmlDecodingFailed,
				message: `Failed to decode quoted-printable body with charset ${charset}`,
				userMessage: "MHTML 本文のデコードに失敗しました。",
				context: { charset },
				cause,
			}),
		);
	}
};

export const decodeBase64 = (
	input: string,
	charset = "utf-8",
): Result<string, DomainError> => {
	try {
		const normalized = input.replace(/\s+/g, "");
		const binary = atob(normalized);
		const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
		const decoder = new TextDecoder(charset);
		return ok(decoder.decode(bytes));
	} catch (cause) {
		return err(
			new DomainError({
				code: ErrorCode.MhtmlDecodingFailed,
				message: `Failed to decode base64 body with charset ${charset}`,
				userMessage: "MHTML 本文のデコードに失敗しました。",
				context: { charset },
				cause,
			}),
		);
	}
};

export interface PartLike {
	readonly headers: ReadonlyMap<string, string>;
	readonly body: string;
}

const CHARSET_RE = /charset\s*=\s*("([^"]+)"|([^;\s]+))/i;

export const charsetOf = (part: PartLike): string => {
	const contentType = part.headers.get("content-type");
	if (contentType === undefined) return "utf-8";
	const match = contentType.match(CHARSET_RE);
	if (match === null) return "utf-8";
	return ((match[2] ?? match[3]) as string).toLowerCase();
};

export const decodePart = (part: PartLike): Result<string, DomainError> => {
	const encoding = (
		part.headers.get("content-transfer-encoding") ?? "7bit"
	).toLowerCase();
	const charset = charsetOf(part);
	switch (encoding) {
		case "quoted-printable":
			return decodeQuotedPrintable(part.body, charset);
		case "base64":
			return decodeBase64(part.body, charset);
		case "7bit":
		case "8bit":
		case "binary":
			return ok(part.body);
		default:
			return err(
				new DomainError({
					code: ErrorCode.MhtmlDecodingFailed,
					message: `Unsupported Content-Transfer-Encoding: ${encoding}`,
					userMessage: "MHTML のエンコーディング形式がサポート外です。",
					context: { encoding },
				}),
			);
	}
};
