import {
	type Assessment,
	assessGraduation,
} from "../../application/assess-graduation.ts";
import { isOk } from "../../domain/errors/result.ts";
import { defaultRegistry } from "../../domain/rulesets/index.ts";
import { profileStore } from "./profile.svelte.ts";
import { transcriptStore } from "./transcript.svelte.ts";

/**
 * Exposes the current graduation assessment.
 *
 * By default this is derived on demand from the profile + transcript via the TS
 * engine (paste / MHTML paths). The PDF path instead runs the Rust/WASM core and
 * pushes a ready-made assessment via `set`, which then takes precedence — so the
 * dashboard and requirement pages render WASM-produced results unchanged.
 */
class AssessmentStore {
	#override = $state<Assessment | null>(null);

	/** Inject an externally computed assessment (e.g. from the WASM core). */
	set(assessment: Assessment): void {
		this.#override = assessment;
	}

	/** Drop any injected assessment, reverting to on-demand TS computation. */
	clear(): void {
		this.#override = null;
	}

	get current(): Assessment | null {
		if (this.#override !== null) return this.#override;
		const profile = profileStore.current;
		if (profile === null) return null;
		const record = transcriptStore.current;
		if (record === null) return null;
		const ruleSet = defaultRegistry.resolve(profile);
		if (!isOk(ruleSet)) return null;
		return assessGraduation(record, ruleSet.value);
	}
}

export const assessmentStore = new AssessmentStore();
