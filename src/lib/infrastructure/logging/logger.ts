import { isLevelEnabled, type LogLevel } from "./log-level.ts";
import type { LogRecord, LogSink } from "./log-record.ts";

export interface LoggerOptions {
	readonly sink: LogSink;
	readonly minLevel?: LogLevel;
	readonly baseContext?: Readonly<Record<string, unknown>>;
	readonly now?: () => Date;
}

const EMPTY_CONTEXT: Readonly<Record<string, unknown>> = Object.freeze({});

export class Logger {
	readonly #sink: LogSink;
	readonly #minLevel: LogLevel;
	readonly #baseContext: Readonly<Record<string, unknown>>;
	readonly #now: () => Date;

	constructor(options: LoggerOptions) {
		this.#sink = options.sink;
		this.#minLevel = options.minLevel ?? "info";
		this.#baseContext = options.baseContext ?? EMPTY_CONTEXT;
		this.#now = options.now ?? (() => new Date());
	}

	child(extra: Readonly<Record<string, unknown>>): Logger {
		return new Logger({
			sink: this.#sink,
			minLevel: this.#minLevel,
			baseContext: { ...this.#baseContext, ...extra },
			now: this.#now,
		});
	}

	debug(
		message: string,
		context: Readonly<Record<string, unknown>> = {},
	): void {
		this.#emit("debug", message, context);
	}

	info(message: string, context: Readonly<Record<string, unknown>> = {}): void {
		this.#emit("info", message, context);
	}

	warn(message: string, context: Readonly<Record<string, unknown>> = {}): void {
		this.#emit("warn", message, context);
	}

	error(
		message: string,
		error: unknown,
		context: Readonly<Record<string, unknown>> = {},
	): void {
		this.#emit("error", message, context, error);
	}

	#emit(
		level: LogLevel,
		message: string,
		context: Readonly<Record<string, unknown>>,
		error?: unknown,
	): void {
		if (!isLevelEnabled(level, this.#minLevel)) return;
		const base = {
			level,
			message,
			timestamp: this.#now().toISOString(),
			context: { ...this.#baseContext, ...context },
		};
		const record: LogRecord = error !== undefined ? { ...base, error } : base;
		this.#sink.write(record);
	}
}
