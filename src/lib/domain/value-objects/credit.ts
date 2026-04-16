import { DomainError } from "../errors/domain-error.ts";
import { ErrorCode } from "../errors/error-code.ts";

declare const CreditBrand: unique symbol;

export type Credit = number & { readonly [CreditBrand]: "Credit" };

const assertValid = (value: number): void => {
	if (!Number.isFinite(value)) {
		throw new DomainError({
			code: ErrorCode.CreditNonFinite,
			message: `Credit value must be finite; received ${value}`,
			userMessage: "単位数には有限の数値を指定してください。",
			context: { value },
		});
	}
	if (value < 0) {
		throw new DomainError({
			code: ErrorCode.CreditNegative,
			message: `Credit value must be non-negative; received ${value}`,
			userMessage: "単位数は 0 以上で指定してください。",
			context: { value },
		});
	}
};

const brand = (value: number): Credit => value as Credit;

export const Credit = {
	zero: brand(0),
	of: (value: number): Credit => {
		assertValid(value);
		return brand(value);
	},
	plus: (a: Credit, b: Credit): Credit => brand(a + b),
	sum: (values: readonly Credit[]): Credit =>
		brand(values.reduce<number>((acc, v) => acc + v, 0)),
	isAtLeast: (value: Credit, threshold: Credit): boolean => value >= threshold,
	toNumber: (c: Credit): number => c,
} as const;
