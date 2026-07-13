/**
 * Pure computation of the completed / in-progress / remaining width ratios for
 * the progress bar. Split out from the UI component so it can be unit-tested.
 *
 * `tentativeActual` is the actual assuming every in-progress course passes;
 * `undefined` means no in-progress data. The in-progress layer is stacked
 * beneath the completed layer, so its width is given as the combined ratio
 * (completed + in-progress) to avoid gaps.
 */
export interface ProgressLayoutInput {
	readonly actual: number;
	readonly required: number;
	readonly tentativeActual?: number | undefined;
}

export interface ProgressLayout {
	/** Width percentage of the completed section (0-100). */
	readonly completedPct: number;
	/**
	 * Combined width percentage of completed + in-progress (0-100), used as the
	 * layer beneath the completed section. Guaranteed >= completedPct.
	 */
	readonly tentativePct: number;
	/** Whether the in-progress section occupies any width (tentativePct > completedPct). */
	readonly hasInProgress: boolean;
	/** Actual including in-progress, for aria-valuetext etc. */
	readonly tentativeActualOrActual: number;
}

export const computeProgressLayout = (
	input: ProgressLayoutInput,
): ProgressLayout => {
	const { actual, required, tentativeActual } = input;
	if (required <= 0) {
		return {
			completedPct: 0,
			tentativePct: 0,
			hasInProgress: false,
			tentativeActualOrActual: actual,
		};
	}
	const clampedActual = Math.max(0, Math.min(actual, required));
	const completedPct = (clampedActual / required) * 100;
	const tentActualRaw = tentativeActual ?? actual;
	const tentActual = Math.max(actual, tentActualRaw);
	const clampedTent = Math.max(0, Math.min(tentActual, required));
	const tentativePct = (clampedTent / required) * 100;
	return {
		completedPct,
		tentativePct,
		hasInProgress: tentativePct > completedPct,
		tentativeActualOrActual: tentActual,
	};
};

/**
 * Bar state, used to branch badge / subtext colours.
 * - 'satisfied'   = met with confirmed credits
 * - 'in-progress' = short now, but will be met if in-progress courses pass
 * - 'unmet'       = short even with in-progress, or short with no in-progress data
 */
export type ProgressState = "satisfied" | "in-progress" | "unmet";

export const resolveProgressState = (input: {
	readonly satisfied: boolean;
	readonly tentativeSatisfied?: boolean | undefined;
}): ProgressState => {
	if (input.satisfied) return "satisfied";
	if (input.tentativeSatisfied === true) return "in-progress";
	return "unmet";
};
