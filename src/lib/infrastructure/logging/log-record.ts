import type { LogLevel } from "./log-level.ts";

export interface LogRecord {
	readonly level: LogLevel;
	readonly message: string;
	readonly timestamp: string;
	readonly context: Readonly<Record<string, unknown>>;
	readonly error?: unknown;
}

export interface LogSink {
	write(record: LogRecord): void;
}
