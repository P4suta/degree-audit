/**
 * Informational user-facing notices, lighter than `errorsStore`: shown as
 * yellow/blue notes rather than a red banner. Currently used for import-time
 * warnings such as "N uncategorised courses".
 *
 * When `autoDismissMs` is set, WarningBanner auto-dismisses the entry (paused
 * while hovered); `errorsStore` remains manual-only.
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
