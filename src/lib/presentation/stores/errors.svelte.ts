import type { DomainError } from "../../domain/errors/domain-error.ts";

/**
 * Holds errors in a FIFO queue. `push` appends to the tail and ErrorBanner
 * displays `current` (the head); `dismiss` drops the head to expose the next
 * error. This preserves the first cause when errors occur in quick succession.
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
