import { describe, expect, it } from "vitest";
import {
	err,
	flatMap,
	isErr,
	isOk,
	mapOk,
	ok,
	type Result,
	unwrapOr,
} from "./result.ts";

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

	describe("mapOk", () => {
		it("applies fn on ok", () => {
			expect(mapOk(ok(2), (v) => v * 3)).toEqual(ok(6));
		});
		it("passes through on err", () => {
			const e: Result<number, string> = err("x");
			expect(mapOk(e, (v: number) => v + 1)).toEqual(e);
		});
	});

	describe("flatMap", () => {
		it("chains on ok", () => {
			expect(flatMap(ok(2), (v) => ok(v + 1))).toEqual(ok(3));
		});
		it("short-circuits on err", () => {
			const e: Result<number, string> = err("x");
			expect(flatMap(e, (v: number) => ok(v + 1))).toEqual(e);
		});
		it("can swap to a different error type", () => {
			const r = flatMap(ok(2), (_v): Result<number, "E"> => err("E"));
			expect(r).toEqual(err("E"));
		});
	});

	describe("unwrapOr", () => {
		it("returns value on ok", () => {
			expect(unwrapOr(ok(5), 0)).toBe(5);
		});
		it("returns fallback on err", () => {
			expect(unwrapOr(err("e") as Result<number, string>, 0)).toBe(0);
		});
	});
});
