/**
 * 情報レベルのユーザー向け通知。`errorsStore` より軽い扱いで、赤バナーでは
 * なく黄／青の注意書きとして表示する。現状は「未分類の科目が N 件ある」といった
 * 取り込み時の警告を流すために使う。
 */
export interface Warning {
	readonly id: string;
	readonly message: string;
}

class WarningsStore {
	#items: Warning[] = $state([]);

	get items(): readonly Warning[] {
		return this.#items;
	}

	set(id: string, message: string): void {
		this.dismiss(id);
		this.#items.push({ id, message });
	}

	dismiss(id: string): void {
		this.#items = this.#items.filter((w) => w.id !== id);
	}

	clear(): void {
		this.#items = [];
	}
}

export const warningsStore = new WarningsStore();
