import { DomainError } from "./domain-error.ts";
import type { ErrorCode } from "./error-code.ts";

export const isDomainError = (value: unknown): value is DomainError =>
	value instanceof DomainError;

export const hasCode = <C extends ErrorCode>(
	value: unknown,
	code: C,
): value is DomainError & { readonly code: C } =>
	isDomainError(value) && value.code === code;
