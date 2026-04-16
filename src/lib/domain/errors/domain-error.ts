import type { ErrorCode } from "./error-code.ts";

export interface DomainErrorInput {
	readonly code: ErrorCode;
	readonly message: string;
	readonly userMessage: string;
	readonly context?: Readonly<Record<string, unknown>>;
	readonly cause?: unknown;
}

export interface DomainErrorJSON {
	readonly name: string;
	readonly code: ErrorCode;
	readonly message: string;
	readonly userMessage: string;
	readonly context: Readonly<Record<string, unknown>>;
	readonly cause?: unknown;
}

const EMPTY_CONTEXT: Readonly<Record<string, unknown>> = Object.freeze({});

export class DomainError extends Error {
	readonly code: ErrorCode;
	readonly userMessage: string;
	readonly context: Readonly<Record<string, unknown>>;

	constructor(input: DomainErrorInput) {
		super(
			input.message,
			input.cause !== undefined ? { cause: input.cause } : undefined,
		);
		this.name = "DomainError";
		this.code = input.code;
		this.userMessage = input.userMessage;
		this.context = input.context ?? EMPTY_CONTEXT;
	}

	toJSON(): DomainErrorJSON {
		const base = {
			name: this.name,
			code: this.code,
			message: this.message,
			userMessage: this.userMessage,
			context: this.context,
		};
		return this.cause !== undefined
			? { ...base, cause: serializeCause(this.cause) }
			: base;
	}
}

const serializeCause = (cause: unknown): unknown => {
	if (cause instanceof DomainError) {
		return cause.toJSON();
	}
	if (cause instanceof Error) {
		return {
			name: cause.name,
			message: cause.message,
			stack: cause.stack,
		};
	}
	return cause;
};
