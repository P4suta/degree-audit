import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { Credit } from "./credit.ts";

const nonNegativeFinite = fc.double({
	min: 0,
	max: 1_000_000,
	noNaN: true,
	noDefaultInfinity: true,
});

const nonNegativeInt = fc.integer({ min: 0, max: 1_000 });

describe("Credit properties", () => {
	it("of accepts every non-negative finite number", () => {
		fc.assert(
			fc.property(nonNegativeFinite, (x) => {
				expect(Credit.toNumber(Credit.of(x))).toBe(x);
			}),
		);
	});

	it("of rejects every negative finite number", () => {
		fc.assert(
			fc.property(
				fc.double({
					max: -Number.MIN_VALUE,
					noNaN: true,
					noDefaultInfinity: true,
				}),
				(x) => {
					expect(() => Credit.of(x)).toThrow();
				},
			),
		);
	});

	it("plus is commutative", () => {
		fc.assert(
			fc.property(nonNegativeInt, nonNegativeInt, (a, b) => {
				const ca = Credit.of(a);
				const cb = Credit.of(b);
				expect(Credit.toNumber(Credit.plus(ca, cb))).toBe(
					Credit.toNumber(Credit.plus(cb, ca)),
				);
			}),
		);
	});

	it("plus is associative (on integers)", () => {
		fc.assert(
			fc.property(nonNegativeInt, nonNegativeInt, nonNegativeInt, (a, b, c) => {
				const ca = Credit.of(a);
				const cb = Credit.of(b);
				const cc = Credit.of(c);
				expect(Credit.toNumber(Credit.plus(Credit.plus(ca, cb), cc))).toBe(
					Credit.toNumber(Credit.plus(ca, Credit.plus(cb, cc))),
				);
			}),
		);
	});

	it("zero is the identity for plus", () => {
		fc.assert(
			fc.property(nonNegativeFinite, (x) => {
				const cx = Credit.of(x);
				expect(Credit.toNumber(Credit.plus(Credit.zero, cx))).toBe(x);
				expect(Credit.toNumber(Credit.plus(cx, Credit.zero))).toBe(x);
			}),
		);
	});

	it("sum equals left fold with plus", () => {
		fc.assert(
			fc.property(fc.array(nonNegativeInt, { maxLength: 20 }), (xs) => {
				const credits = xs.map((x) => Credit.of(x));
				const viaSum = Credit.toNumber(Credit.sum(credits));
				const viaFold = credits.reduce<number>(
					(acc, c) => acc + Credit.toNumber(c),
					0,
				);
				expect(viaSum).toBe(viaFold);
			}),
		);
	});

	it("isAtLeast is reflexive", () => {
		fc.assert(
			fc.property(nonNegativeFinite, (x) => {
				const c = Credit.of(x);
				expect(Credit.isAtLeast(c, c)).toBe(true);
			}),
		);
	});

	it("isAtLeast is transitive", () => {
		fc.assert(
			fc.property(nonNegativeInt, nonNegativeInt, nonNegativeInt, (a, b, c) => {
				const [hi, mid, lo] = [a, b, c]
					.sort((x, y) => y - x)
					.map((v) => Credit.of(v)) as [Credit, Credit, Credit];
				if (Credit.isAtLeast(hi, mid) && Credit.isAtLeast(mid, lo)) {
					expect(Credit.isAtLeast(hi, lo)).toBe(true);
				}
			}),
		);
	});
});
