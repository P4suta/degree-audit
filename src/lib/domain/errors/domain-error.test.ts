import { describe, expect, it } from "vitest";
import { DomainError } from "./domain-error.ts";
import { ErrorCode } from "./error-code.ts";
import { hasCode, isDomainError } from "./guards.ts";

describe("DomainError", () => {
	it("captures code, messages and context", () => {
		const err = new DomainError({
			code: ErrorCode.CreditNegative,
			message: "negative",
			userMessage: "負の単位は不可",
			context: { value: -1 },
		});

		expect(err.name).toBe("DomainError");
		expect(err.code).toBe(ErrorCode.CreditNegative);
		expect(err.message).toBe("negative");
		expect(err.userMessage).toBe("負の単位は不可");
		expect(err.context).toEqual({ value: -1 });
		expect(err.cause).toBeUndefined();
		expect(err).toBeInstanceOf(Error);
	});

	it("defaults to an empty frozen context when not provided", () => {
		const err = new DomainError({
			code: ErrorCode.CreditNonFinite,
			message: "x",
			userMessage: "y",
		});
		expect(err.context).toEqual({});
		expect(Object.isFrozen(err.context)).toBe(true);
	});

	it("preserves a cause when provided", () => {
		const inner = new Error("boom");
		const err = new DomainError({
			code: ErrorCode.CreditNegative,
			message: "x",
			userMessage: "y",
			cause: inner,
		});
		expect(err.cause).toBe(inner);
	});

	describe("toJSON", () => {
		it("serializes without cause when absent", () => {
			const err = new DomainError({
				code: ErrorCode.CreditNegative,
				message: "m",
				userMessage: "u",
				context: { k: 1 },
			});
			const json = err.toJSON();
			expect(json).toEqual({
				name: "DomainError",
				code: ErrorCode.CreditNegative,
				message: "m",
				userMessage: "u",
				context: { k: 1 },
			});
			expect("cause" in json).toBe(false);
		});

		it("serializes a DomainError cause recursively via toJSON", () => {
			const inner = new DomainError({
				code: ErrorCode.CreditNonFinite,
				message: "inner",
				userMessage: "inner-u",
			});
			const outer = new DomainError({
				code: ErrorCode.CreditNegative,
				message: "outer",
				userMessage: "outer-u",
				cause: inner,
			});
			const json = outer.toJSON();
			expect(json.cause).toMatchObject({
				name: "DomainError",
				code: ErrorCode.CreditNonFinite,
			});
		});

		it("serializes a plain Error cause with name/message/stack", () => {
			const inner = new Error("boom");
			const err = new DomainError({
				code: ErrorCode.CreditNegative,
				message: "m",
				userMessage: "u",
				cause: inner,
			});
			const json = err.toJSON();
			expect(json.cause).toMatchObject({ name: "Error", message: "boom" });
		});

		it("returns unknown-typed causes as-is", () => {
			const err = new DomainError({
				code: ErrorCode.CreditNegative,
				message: "m",
				userMessage: "u",
				cause: "string-cause",
			});
			expect(err.toJSON().cause).toBe("string-cause");
		});
	});
});

describe("guards", () => {
	it("isDomainError distinguishes DomainError from other values", () => {
		const err = new DomainError({
			code: ErrorCode.CreditNegative,
			message: "m",
			userMessage: "u",
		});
		expect(isDomainError(err)).toBe(true);
		expect(isDomainError(new Error("plain"))).toBe(false);
		expect(isDomainError(null)).toBe(false);
		expect(isDomainError("x")).toBe(false);
	});

	it("hasCode narrows to the requested code", () => {
		const err = new DomainError({
			code: ErrorCode.CreditNegative,
			message: "m",
			userMessage: "u",
		});
		expect(hasCode(err, ErrorCode.CreditNegative)).toBe(true);
		expect(hasCode(err, ErrorCode.CreditNonFinite)).toBe(false);
		expect(hasCode(new Error("plain"), ErrorCode.CreditNegative)).toBe(false);
	});
});
