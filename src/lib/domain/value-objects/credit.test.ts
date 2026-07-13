import { describe, expect, it } from "vitest";
import { ErrorCode } from "../errors/error-code.ts";
import { hasCode } from "../errors/guards.ts";
import { Credit } from "./credit.ts";

describe("Credit", () => {
	describe("of", () => {
		it("accepts a non-negative finite number", () => {
			expect(Credit.toNumber(Credit.of(4))).toBe(4);
			expect(Credit.toNumber(Credit.of(0))).toBe(0);
			expect(Credit.toNumber(Credit.of(0.5))).toBe(0.5);
		});

		it("rejects negative values with CreditNegative", () => {
			try {
				Credit.of(-1);
				expect.unreachable("should have thrown");
			} catch (e) {
				expect(hasCode(e, ErrorCode.CreditNegative)).toBe(true);
				if (hasCode(e, ErrorCode.CreditNegative)) {
					expect(e.context).toEqual({ value: -1 });
					expect(e.userMessage).toMatch(/0 以上/);
				}
			}
		});

		it("rejects NaN with CreditNonFinite", () => {
			try {
				Credit.of(Number.NaN);
				expect.unreachable("should have thrown");
			} catch (e) {
				expect(hasCode(e, ErrorCode.CreditNonFinite)).toBe(true);
			}
		});

		it("rejects Infinity with CreditNonFinite", () => {
			try {
				Credit.of(Number.POSITIVE_INFINITY);
				expect.unreachable("should have thrown");
			} catch (e) {
				expect(hasCode(e, ErrorCode.CreditNonFinite)).toBe(true);
			}
		});
	});

	describe("toNumber", () => {
		it("extracts the underlying numeric value", () => {
			expect(Credit.toNumber(Credit.of(7))).toBe(7);
		});
	});
});
