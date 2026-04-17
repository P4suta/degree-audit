import type { AcademicRecord } from "../../domain/entities/academic-record.ts";

/**
 * 履修記録のメモリ保持ストア。
 *
 * **永続化はしない**。成績という機微情報を扱うため、タブを閉じたら必ず消える
 * メモリ保持のみに限定する（LocalStorage / SessionStorage 等には書き出さない）。
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
