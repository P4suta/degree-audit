import type { DomainError } from "../../domain/errors/domain-error.ts";

/**
 * FIFO キューでエラーを保持する。`push` は新しいエラーを末尾に追加し、
 * ErrorBanner は `current`（先頭）を表示する。`dismiss` で先頭をドロップして
 * 次のエラーが露出する。連続してエラーが起きたときに最初の原因を失わない。
 */
class ErrorsStore {
	#queue: DomainError[] = $state([]);

	get current(): DomainError | null {
		return this.#queue[0] ?? null;
	}

	get count(): number {
		return this.#queue.length;
	}

	push(error: DomainError): void {
		this.#queue.push(error);
	}

	dismiss(): void {
		this.#queue.shift();
	}

	clear(): void {
		this.#queue.length = 0;
	}
}

export const errorsStore = new ErrorsStore();
