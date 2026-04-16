import { DomainError } from "../../../domain/errors/domain-error.ts";
import { ErrorCode } from "../../../domain/errors/error-code.ts";
import { err, ok, type Result } from "../../../domain/errors/result.ts";

export interface MultipartPart {
	readonly headers: ReadonlyMap<string, string>;
	readonly body: string;
}

const CRLF_RE = /\r\n/g;

const normalizeLineEndings = (raw: string): string =>
	raw.replace(CRLF_RE, "\n");

const extractBoundary = (
	headers: ReadonlyMap<string, string>,
): string | undefined => {
	const contentType = headers.get("content-type");
	if (contentType === undefined) return undefined;
	if (!/^multipart\//i.test(contentType)) return undefined;
	const match = contentType.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
	if (!match) return undefined;
	return match[1] ?? match[2];
};

const isContinuation = (line: string): boolean => /^[ \t]/.test(line);

const parseHeaderBlock = (headerBlock: string): ReadonlyMap<string, string> => {
	const lines = headerBlock.split("\n");
	const headers = new Map<string, string>();
	let currentKey: string | undefined;
	let currentValue = "";
	const flush = () => {
		if (currentKey !== undefined) {
			headers.set(currentKey.toLowerCase(), currentValue.trim());
		}
	};
	for (const line of lines) {
		if (currentKey !== undefined && isContinuation(line)) {
			currentValue += ` ${line.trim()}`;
			continue;
		}
		flush();
		currentKey = undefined;
		currentValue = "";
		const sep = line.indexOf(":");
		if (sep <= 0) continue;
		currentKey = line.slice(0, sep).trim();
		currentValue = line.slice(sep + 1).trim();
	}
	flush();
	return headers;
};

const splitHeaderAndBody = (
	block: string,
): { header: string; body: string } => {
	const idx = block.indexOf("\n\n");
	if (idx === -1) {
		return { header: block, body: "" };
	}
	return {
		header: block.slice(0, idx),
		body: block.slice(idx + 2),
	};
};

interface MultipartSplitContext {
	readonly body: string;
	readonly delimiter: string;
}

const prepareSplit = (
	source: string,
): Result<MultipartSplitContext, DomainError> => {
	const normalized = normalizeLineEndings(source);
	const topSplit = splitHeaderAndBody(normalized);
	const topHeaders = parseHeaderBlock(topSplit.header);
	const boundary = extractBoundary(topHeaders);
	if (!boundary) {
		return err(
			new DomainError({
				code: ErrorCode.MhtmlBoundaryMissing,
				message:
					"Could not find a multipart boundary in the MHTML top-level header",
				userMessage: "MHTML の境界指定が見つかりませんでした。",
				context: { contentType: topHeaders.get("content-type") ?? null },
			}),
		);
	}
	const delimiter = `--${boundary}`;
	const closing = `${delimiter}--`;
	const closingIndex = topSplit.body.lastIndexOf(closing);
	const body =
		closingIndex === -1 ? topSplit.body : topSplit.body.slice(0, closingIndex);
	return ok({ body, delimiter });
};

const readPart = (segment: string): MultipartPart | undefined => {
	const trimmed = segment.replace(/^\n+/, "").replace(/\n+$/, "");
	if (trimmed === "") return undefined;
	const { header, body } = splitHeaderAndBody(trimmed);
	return { headers: parseHeaderBlock(header), body };
};

export const splitMultipart = (
	source: string,
): Result<readonly MultipartPart[], DomainError> => {
	const ctx = prepareSplit(source);
	if (!ctx.ok) return ctx;
	const segments = ctx.value.body.split(ctx.value.delimiter);
	const parts: MultipartPart[] = [];
	for (const segment of segments) {
		const part = readPart(segment);
		if (part) parts.push(part);
	}
	return ok(parts);
};

/**
 * 巨大な MHTML の全パートを走査せずに、最初の該当パートだけを取り出す。HTML を
 * 探すのが目的のときに使う。predicate が false を返し続けて末尾まで到達したら
 * `ok(undefined)` を返すので、呼び出し側で「見つからなかった」場合の扱いを
 * 決められる。
 */
export const findFirstPart = (
	source: string,
	predicate: (part: MultipartPart) => boolean,
): Result<MultipartPart | undefined, DomainError> => {
	const ctx = prepareSplit(source);
	if (!ctx.ok) return ctx;
	const { body, delimiter } = ctx.value;
	let cursor = 0;
	while (cursor <= body.length) {
		const nextDelimiter = body.indexOf(delimiter, cursor);
		if (nextDelimiter === -1) {
			const part = readPart(body.slice(cursor));
			if (part && predicate(part)) return ok(part);
			break;
		}
		const segment = body.slice(cursor, nextDelimiter);
		const part = readPart(segment);
		if (part && predicate(part)) return ok(part);
		cursor = nextDelimiter + delimiter.length;
	}
	return ok(undefined);
};
