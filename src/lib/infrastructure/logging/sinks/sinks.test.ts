import { describe, expect, it, vi } from "vitest";
import { DomainError } from "../../../domain/errors/domain-error.ts";
import { ErrorCode } from "../../../domain/errors/error-code.ts";
import type { LogRecord } from "../log-record.ts";
import { BufferSink } from "./buffer-sink.ts";
import { type ConsoleLike, ConsoleSink } from "./console-sink.ts";
import { noopSink } from "./noop-sink.ts";

const record = (overrides: Partial<LogRecord> = {}): LogRecord => ({
	level: "info",
	message: "hello",
	timestamp: "2026-04-17T00:00:00.000Z",
	context: {},
	...overrides,
});

describe("noopSink", () => {
	it("write is a silent no-op", () => {
		expect(() => noopSink.write(record())).not.toThrow();
	});
});

describe("BufferSink", () => {
	it("accumulates records", () => {
		const sink = new BufferSink();
		sink.write(record({ message: "a" }));
		sink.write(record({ message: "b" }));
		expect(sink.records).toHaveLength(2);
		expect(sink.records.map((r) => r.message)).toEqual(["a", "b"]);
	});

	it("clear empties the buffer", () => {
		const sink = new BufferSink();
		sink.write(record());
		sink.clear();
		expect(sink.records).toHaveLength(0);
	});
});

describe("ConsoleSink", () => {
	const makeTarget = (): ConsoleLike & {
		calls: Record<"debug" | "info" | "warn" | "error", unknown[][]>;
	} => {
		const calls = {
			debug: [] as unknown[][],
			info: [] as unknown[][],
			warn: [] as unknown[][],
			error: [] as unknown[][],
		};
		return {
			calls,
			debug: (...args: unknown[]) => calls.debug.push(args),
			info: (...args: unknown[]) => calls.info.push(args),
			warn: (...args: unknown[]) => calls.warn.push(args),
			error: (...args: unknown[]) => calls.error.push(args),
		};
	};

	it.each([
		"debug",
		"info",
		"warn",
		"error",
	] as const)("routes %s records to the matching console method", (level) => {
		const target = makeTarget();
		const sink = new ConsoleSink(target);
		sink.write(record({ level, message: `L ${level}` }));
		expect(target.calls[level]).toHaveLength(1);
	});

	it("includes context when non-empty and omits when empty", () => {
		const target = makeTarget();
		const sink = new ConsoleSink(target);
		sink.write(record({ context: {} }));
		sink.write(record({ context: { k: 1 } }));
		expect(target.calls.info[0]).toHaveLength(1);
		expect(target.calls.info[1]).toHaveLength(2);
		expect(target.calls.info[1]?.[1]).toEqual({ k: 1 });
	});

	it("serializes a DomainError cause via toJSON", () => {
		const target = makeTarget();
		const sink = new ConsoleSink(target);
		const boom = new DomainError({
			code: ErrorCode.CreditNegative,
			message: "m",
			userMessage: "u",
		});
		sink.write(record({ level: "error", error: boom }));
		const args = target.calls.error[0];
		expect(args?.[1]).toMatchObject({
			name: "DomainError",
			code: ErrorCode.CreditNegative,
		});
	});

	it("serializes a plain Error with name/message/stack", () => {
		const target = makeTarget();
		const sink = new ConsoleSink(target);
		const boom = new Error("kaboom");
		sink.write(record({ level: "error", error: boom }));
		const args = target.calls.error[0];
		expect(args?.[1]).toMatchObject({ name: "Error", message: "kaboom" });
	});

	it("passes unknown-typed errors through as-is", () => {
		const target = makeTarget();
		const sink = new ConsoleSink(target);
		sink.write(record({ level: "error", error: 42 }));
		const args = target.calls.error[0];
		expect(args?.[1]).toBe(42);
	});

	it("defaults its target to the global console", () => {
		const spy = vi.spyOn(console, "info").mockImplementation(() => {});
		try {
			const sink = new ConsoleSink();
			sink.write(record());
			expect(spy).toHaveBeenCalledTimes(1);
		} finally {
			spy.mockRestore();
		}
	});
});
