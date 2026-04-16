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

	it("Credit.zero is a Credit", () => {
		expectTypeOf(Credit.zero).toEqualTypeOf<Credit>();
	});

	it("Credit.plus takes Credit args and returns Credit", () => {
		expectTypeOf(Credit.plus).parameters.toEqualTypeOf<[Credit, Credit]>();
		expectTypeOf(Credit.plus).returns.toEqualTypeOf<Credit>();
	});

	it("Credit.sum takes ReadonlyArray<Credit> and returns Credit", () => {
		expectTypeOf(Credit.sum).parameters.toEqualTypeOf<[readonly Credit[]]>();
		expectTypeOf(Credit.sum).returns.toEqualTypeOf<Credit>();
	});

	it("Credit.isAtLeast takes Credit args and returns boolean", () => {
		expectTypeOf(Credit.isAtLeast).parameters.toEqualTypeOf<[Credit, Credit]>();
		expectTypeOf(Credit.isAtLeast).returns.toEqualTypeOf<boolean>();
	});

	it("Credit.toNumber extracts a number", () => {
		expectTypeOf(Credit.toNumber).parameters.toEqualTypeOf<[Credit]>();
		expectTypeOf(Credit.toNumber).returns.toEqualTypeOf<number>();
	});
});
