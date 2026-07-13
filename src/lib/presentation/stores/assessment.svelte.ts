import type { Assessment } from "$lib/application/assessment-types";

/**
 * Exposes the current graduation assessment.
 *
 * The PDF import path runs the Rust/WASM core and injects a ready-made assessment
 * via `set`; the dashboard and requirement pages render it unchanged. The Rust
 * core is the single source of truth — there is no TypeScript fallback engine.
 */
class AssessmentStore {
	#current = $state<Assessment | null>(null);

	/** Inject the assessment computed by the WASM core. */
	set(assessment: Assessment): void {
		this.#current = assessment;
	}

	/** Drop the current assessment. */
	clear(): void {
		this.#current = null;
	}

	get current(): Assessment | null {
		return this.#current;
	}
}

export const assessmentStore = new AssessmentStore();
