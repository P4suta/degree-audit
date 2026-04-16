import type { DomainError } from "../../domain/errors/domain-error.ts";

class ErrorsStore {
	current: DomainError | null = $state(null);

	push(error: DomainError): void {
		this.current = error;
	}

	clear(): void {
		this.current = null;
	}
}

export const errorsStore = new ErrorsStore();
