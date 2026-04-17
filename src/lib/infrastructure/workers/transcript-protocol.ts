import { DomainError } from "../../domain/errors/domain-error.ts";
import type { ErrorCode } from "../../domain/errors/error-code.ts";
import type { Result } from "../../domain/errors/result.ts";
import type { RawCourse } from "../parsers/transcript-parser.ts";

/**
 * Worker 境界を越えるために、DomainError を構造化クローン可能な
 * プレーンオブジェクトに変換する。cause は一般にクローン不可なので落とす
 * （`message` に残るのでデバッグ情報は保たれる）。
 */
export interface SerializedDomainError {
	readonly kind: "DomainError";
	readonly code: ErrorCode;
	readonly message: string;
	readonly userMessage: string;
	readonly context?: Readonly<Record<string, unknown>>;
}

export type SerializedResult =
	| { readonly ok: true; readonly value: readonly RawCourse[] }
	| { readonly ok: false; readonly error: SerializedDomainError };

export interface ParseRequest {
	readonly type: "parse";
	readonly id: string;
	readonly bytes: Uint8Array;
}

export interface ParseResponse {
	readonly type: "parse-result";
	readonly id: string;
	readonly result: SerializedResult;
}

const serializeContext = (
	context: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | undefined => {
	// context の値が structured-clone 不可能な可能性があるので、
	// JSON 経由でプリミティブのみに落とす。元の形を壊すことはあるが
	// Worker 越しでの可読性を優先。
	try {
		return JSON.parse(JSON.stringify(context));
	} catch {
		return undefined;
	}
};

export const serializeError = (error: DomainError): SerializedDomainError => {
	const ctx = serializeContext(error.context);
	return {
		kind: "DomainError",
		code: error.code,
		message: error.message,
		userMessage: error.userMessage,
		...(ctx !== undefined ? { context: ctx } : {}),
	};
};

export const deserializeError = (data: SerializedDomainError): DomainError =>
	new DomainError({
		code: data.code,
		message: data.message,
		userMessage: data.userMessage,
		...(data.context !== undefined ? { context: data.context } : {}),
	});

export const serializeResult = (
	result: Result<readonly RawCourse[], DomainError>,
): SerializedResult =>
	result.ok
		? { ok: true, value: result.value }
		: { ok: false, error: serializeError(result.error) };

export const deserializeResult = (
	data: SerializedResult,
): Result<readonly RawCourse[], DomainError> =>
	data.ok
		? { ok: true, value: data.value }
		: { ok: false, error: deserializeError(data.error) };
