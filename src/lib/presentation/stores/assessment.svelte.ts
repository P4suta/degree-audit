import {
	type Assessment,
	assessGraduation,
} from "../../application/assess-graduation.ts";
import { isOk } from "../../domain/errors/result.ts";
import { defaultRegistry } from "../../domain/rulesets/index.ts";
import { profileStore } from "./profile.svelte.ts";
import { transcriptStore } from "./transcript.svelte.ts";

class AssessmentStore {
	get current(): Assessment | null {
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
