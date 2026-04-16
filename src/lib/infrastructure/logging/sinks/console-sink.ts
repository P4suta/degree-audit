import { DomainError } from "../../../domain/errors/domain-error.ts";
import type { LogRecord, LogSink } from "../log-record.ts";

export interface ConsoleLike {
	debug(...args: unknown[]): void;
	info(...args: unknown[]): void;
	warn(...args: unknown[]): void;
	error(...args: unknown[]): void;
}

export class ConsoleSink implements LogSink {
	readonly #target: ConsoleLike;

	constructor(target: ConsoleLike = console) {
		this.#target = target;
	}

	write(record: LogRecord): void {
		const header = `[${record.timestamp}] ${record.level.toUpperCase()} ${record.message}`;
		const args: unknown[] = [header];
		if (Object.keys(record.context).length > 0) {
			args.push(record.context);
		}
		if (record.error !== undefined) {
			args.push(serializeError(record.error));
		}
		switch (record.level) {
			case "debug":
				this.#target.debug(...args);
				return;
			case "info":
				this.#target.info(...args);
				return;
			case "warn":
				this.#target.warn(...args);
				return;
			case "error":
				this.#target.error(...args);
				return;
		}
	}
}

const serializeError = (error: unknown): unknown => {
	if (error instanceof DomainError) {
		return error.toJSON();
	}
	if (error instanceof Error) {
		return { name: error.name, message: error.message, stack: error.stack };
	}
	return error;
};
