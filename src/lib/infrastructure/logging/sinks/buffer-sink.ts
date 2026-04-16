import type { LogRecord, LogSink } from "../log-record.ts";

export class BufferSink implements LogSink {
	readonly #records: LogRecord[] = [];

	write(record: LogRecord): void {
		this.#records.push(record);
	}

	get records(): readonly LogRecord[] {
		return this.#records;
	}

	clear(): void {
		this.#records.length = 0;
	}
}
