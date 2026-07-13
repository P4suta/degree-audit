/**
 * In-memory store for the disclaimer acknowledgement state.
 *
 * Like the other stores, **never persisted**: it resets to false on tab close,
 * reload, or navigating away, so the disclaimer modal shows again.
 *
 * Re-confirming each session is intentional. Because the tool makes judgements
 * that affect a person's academic path, the goal is for users to re-acknowledge
 * the premise every time rather than relying on a single past acknowledgement.
 */
class DisclaimerStore {
	#acknowledged: boolean = $state(false);

	get acknowledged(): boolean {
		return this.#acknowledged;
	}

	acknowledge(): void {
		this.#acknowledged = true;
	}

	reset(): void {
		this.#acknowledged = false;
	}
}

export const disclaimerStore = new DisclaimerStore();
