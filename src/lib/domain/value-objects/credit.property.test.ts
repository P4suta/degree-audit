import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { Credit } from "./credit.ts";

const nonNegativeFinite = fc.double({
	min: 0,
	max: 1_000_000,
	noNaN: true,
	noDefaultInfinity: true,
});

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
});
