<script lang="ts">
	import type { Snippet } from "svelte";
	import * as m from "$lib/paraglide/messages";
	import Progress from "./Progress.svelte";
	import { resolveProgressState } from "./progress-layout.ts";

	/**
	 * Hero meter block: large heading (verdict / requirement name) + thick meter +
	 * numeric readout + auxiliary slots as one unit. Shared by the dashboard's
	 * overall progress and requirement detail. Foregrounded by spacing, not a card.
	 */
	interface Props {
		/** Large heading (graduation verdict or requirement name). */
		readonly title: string;
		readonly actual: number;
		readonly required: number;
		readonly satisfied: boolean;
		readonly tentativeActual?: number | undefined;
		readonly tentativeSatisfied?: boolean | undefined;
		readonly unit?: string;
		/** Auxiliary row below the heading, above the meter (status badges, notes). */
		readonly lead?: Snippet;
		/** Meta info below the readout row (badge group, etc.). */
		readonly meta?: Snippet;
		/** Whether to show the "remaining N / in progress" hint at the right of the readout. */
		readonly showHint?: boolean;
	}

	const {
		title,
		actual,
		required,
		satisfied,
		tentativeActual,
		tentativeSatisfied,
		unit = m.unit_credit(),
		lead,
		meta,
		showHint = true,
	}: Props = $props();

	const state = $derived(
		resolveProgressState({ satisfied, tentativeSatisfied }),
	);
	const remaining = $derived(Math.max(0, required - actual));
	const inProgressDelta = $derived(
		tentativeActual === undefined ? 0 : Math.max(0, tentativeActual - actual),
	);
	// Completion rate (0-100%), capped at 100%.
	const pct = $derived(
		required > 0 ? Math.round(Math.min(100, (actual / required) * 100)) : 0,
	);
	// Projected rate including in-progress, and whether there's a delta.
	const hasInProgress = $derived(
		tentativeActual !== undefined && tentativeActual > actual,
	);
	const tentativePercent = $derived(
		tentativeActual !== undefined && required > 0
			? Math.round(Math.min(100, (tentativeActual / required) * 100))
			: pct,
	);
</script>

<div class="space-y-4">
	<div class="space-y-2">
		<h2 class="text-display text-[color:var(--color-fg)]">{title}</h2>
		{#if lead}
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
				{@render lead()}
			</div>
		{/if}
	</div>

	<div class="space-y-2">
		<Progress
			label={title}
			{actual}
			{required}
			{satisfied}
			{tentativeActual}
			{tentativeSatisfied}
			{unit}
			size="hero"
			showLabel={false}
		/>
		<div
			class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-body text-[color:var(--color-fg-muted)]"
		>
			<span class="tabular-nums">
				<span class="font-semibold text-[color:var(--color-fg)]">{actual}</span>
				<span class="text-[color:var(--color-fg-subtle)]"> / {required} {unit}</span>
				<span class="text-[color:var(--color-fg-subtle)]"> · {pct}%</span>
				{#if hasInProgress}
					<span class="font-medium text-[color:var(--color-accent-link)]">
						→ {tentativePercent}%
					</span>
				{/if}
			</span>
			{#if showHint && state === "in-progress"}
				<span
					class="font-medium tabular-nums text-[color:var(--color-accent-link)]"
				>
					{m.progress_in_progress_hint({ delta: inProgressDelta, unit })}
				</span>
			{:else if showHint && state === "unmet" && remaining > 0}
				<span
					class="font-medium tabular-nums text-[color:var(--color-warning-fg)]"
				>
					{m.progress_remaining({ remaining, unit })}
				</span>
			{/if}
		</div>
	</div>

	{#if meta}
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-small">
			{@render meta()}
		</div>
	{/if}
</div>
