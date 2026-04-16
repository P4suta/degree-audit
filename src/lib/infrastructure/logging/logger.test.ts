import { describe, expect, it } from "vitest";
import { isLevelEnabled, LogLevel } from "./log-level.ts";
import { Logger } from "./logger.ts";
import { BufferSink } from "./sinks/buffer-sink.ts";

const fixedNow = () => new Date("2026-04-17T00:00:00.000Z");

describe("isLevelEnabled", () => {
	it("enables target level and above", () => {
		expect(isLevelEnabled(LogLevel.Info, LogLevel.Debug)).toBe(true);
		expect(isLevelEnabled(LogLevel.Error, LogLevel.Info)).toBe(true);
		expect(isLevelEnabled(LogLevel.Warn, LogLevel.Warn)).toBe(true);
	});

	it("disables target level below threshold", () => {
		expect(isLevelEnabled(LogLevel.Debug, LogLevel.Info)).toBe(false);
		expect(isLevelEnabled(LogLevel.Info, LogLevel.Warn)).toBe(false);
	});
});

describe("Logger", () => {
	const newLogger = (overrides?: {
		minLevel?: LogLevel;
		baseContext?: Readonly<Record<string, unknown>>;
	}) => {
		const sink = new BufferSink();
		const logger = new Logger({
			sink,
			minLevel: overrides?.minLevel ?? LogLevel.Debug,
			baseContext: overrides?.baseContext ?? {},
			now: fixedNow,
		});
		return { sink, logger };
	};

	it("defaults minLevel to info, baseContext to {}, now to current time", () => {
		const sink = new BufferSink();
		const logger = new Logger({ sink });
		logger.debug("ignored");
		logger.info("hi");
		expect(sink.records).toHaveLength(1);
		expect(sink.records[0]?.message).toBe("hi");
		expect(sink.records[0]?.context).toEqual({});
		expect(typeof sink.records[0]?.timestamp).toBe("string");
	});

	it.each([
		{ method: "debug" as const, level: LogLevel.Debug },
		{ method: "info" as const, level: LogLevel.Info },
		{ method: "warn" as const, level: LogLevel.Warn },
	])("$method writes a record at $level", ({ method, level }) => {
		const { sink, logger } = newLogger();
		logger[method]("m", { k: 1 });
		expect(sink.records).toHaveLength(1);
		const rec = sink.records[0];
		expect(rec?.level).toBe(level);
		expect(rec?.message).toBe("m");
		expect(rec?.context).toEqual({ k: 1 });
		expect(rec?.timestamp).toBe("2026-04-17T00:00:00.000Z");
		expect(rec?.error).toBeUndefined();
	});

	it("error writes with an error payload", () => {
		const { sink, logger } = newLogger();
		const boom = new Error("boom");
		logger.error("failed", boom, { rule: "R1" });
		expect(sink.records).toHaveLength(1);
		const rec = sink.records[0];
		expect(rec?.level).toBe(LogLevel.Error);
		expect(rec?.error).toBe(boom);
		expect(rec?.context).toEqual({ rule: "R1" });
	});

	it("filters records below minLevel", () => {
		const { sink, logger } = newLogger({ minLevel: LogLevel.Warn });
		logger.debug("d");
		logger.info("i");
		logger.warn("w");
		logger.error("e", new Error("x"));
		expect(sink.records.map((r) => r.level)).toEqual([
			LogLevel.Warn,
			LogLevel.Error,
		]);
	});

	it("child merges baseContext and inherits sink/minLevel/now", () => {
		const { sink, logger } = newLogger({ baseContext: { app: "degree" } });
		const child = logger.child({ rule: "R1" });
		child.info("m", { extra: true });
		const rec = sink.records[0];
		expect(rec?.context).toEqual({ app: "degree", rule: "R1", extra: true });
		expect(rec?.timestamp).toBe("2026-04-17T00:00:00.000Z");
	});

	it("uses per-call context defaulted to {}", () => {
		const { sink, logger } = newLogger();
		logger.info("m");
		expect(sink.records[0]?.context).toEqual({});
	});
});
