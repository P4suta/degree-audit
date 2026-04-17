/**
 * 情報レベルのユーザー向け通知。`errorsStore` より軽い扱いで、赤バナーでは
 * なく黄／青の注意書きとして表示する。現状は「未分類の科目が N 件ある」といった
 * 取り込み時の警告を流すために使う。
 *
 * `autoDismissMs` を指定すると WarningBanner 側で自動消去される（ホバー中は
 * 停止する）。`errorsStore` は従来通り手動のみ。
 */
export interface Warning {
	readonly id: string;
	readonly message: string;
	readonly autoDismissMs?: number;
}

interface SetOptions {
	readonly autoDismissMs?: number;
}

class WarningsStore {
	#items: Warning[] = $state([]);

	get items(): readonly Warning[] {
		return this.#items;
	}

	set(id: string, message: string, options: SetOptions = {}): void {
		this.dismiss(id);
		const entry: Warning =
			options.autoDismissMs === undefined
				? { id, message }
				: { id, message, autoDismissMs: options.autoDismissMs };
		this.#items.push(entry);
	}

	dismiss(id: string): void {
		this.#items = this.#items.filter((w) => w.id !== id);
	}

	clear(): void {
		this.#items = [];
	}
}

export const warningsStore = new WarningsStore();
