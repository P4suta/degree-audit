import type { AcademicRecord } from "../../domain/entities/academic-record.ts";

/**
 * In-memory store for the academic record.
 *
 * **Never persisted.** Because grades are sensitive, the record is kept in
 * memory only and always cleared when the tab closes (never written to
 * LocalStorage / SessionStorage etc.).
 */
class TranscriptStore {
	#current: AcademicRecord | null = $state(null);

	get current(): AcademicRecord | null {
		return this.#current;
	}

	set(record: AcademicRecord): void {
		this.#current = record;
	}

	clear(): void {
		this.#current = null;
	}
}

export const transcriptStore = new TranscriptStore();
