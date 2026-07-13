import { describe, expectTypeOf, it } from "vitest";
import { Credit } from "./credit.ts";

describe("Credit types", () => {
	it("Credit.of returns a Credit", () => {
		expectTypeOf(Credit.of(1)).toEqualTypeOf<Credit>();
	});

	it("Credit is assignable to number (subtype)", () => {
		const c = Credit.of(1);
		expectTypeOf<typeof c>().toMatchTypeOf<number>();
	});

	it("plain number is NOT assignable to Credit (brand prevents forging)", () => {
		expectTypeOf<number>().not.toMatchTypeOf<Credit>();
	});

	it("Credit.toNumber extracts a number", () => {
		expectTypeOf(Credit.toNumber).parameters.toEqualTypeOf<[Credit]>();
		expectTypeOf(Credit.toNumber).returns.toEqualTypeOf<number>();
	});
});
