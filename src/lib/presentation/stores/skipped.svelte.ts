import type { MappingFailure } from "../../infrastructure/mappers/raw-to-course.ts";

/**
 * 直近の取り込みでスキップされた科目情報。session-scope（永続化しない）で
 * Dashboard / Import 画面で共有できるようにする。
 * `runed.PersistedState` と違って LocalStorage にも保持しないため、リロード
 * したら消える — これは意図的（プライバシー配慮 + 取り込みのたび更新される）。
 */
class SkippedStore {
	#items: MappingFailure[] = $state([]);

	get items(): readonly MappingFailure[] {
		return this.#items;
	}

	get count(): number {
		return this.#items.length;
	}

	set(items: readonly MappingFailure[]): void {
		this.#items = [...items];
	}

	clear(): void {
		this.#items = [];
	}
}

export const skippedStore = new SkippedStore();
