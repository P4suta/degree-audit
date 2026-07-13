import { describe, expect, it } from "vitest";
import { err, isErr, isOk, ok } from "./result.ts";

describe("Result", () => {
	it("ok wraps a value", () => {
		const r = ok(42);
		expect(r).toEqual({ ok: true, value: 42 });
	});

	it("err wraps an error", () => {
		const r = err("oops");
		expect(r).toEqual({ ok: false, error: "oops" });
	});

	it("isOk discriminates", () => {
		expect(isOk(ok(1))).toBe(true);
		expect(isOk(err("e"))).toBe(false);
	});

	it("isErr discriminates", () => {
		expect(isErr(ok(1))).toBe(false);
		expect(isErr(err("e"))).toBe(true);
	});
});
