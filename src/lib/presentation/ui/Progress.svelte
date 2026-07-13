<script lang="ts">
	import * as m from "$lib/paraglide/messages";
	import {
		computeProgressLayout,
		resolveProgressState,
	} from "./progress-layout.ts";

	interface Props {
		readonly label: string;
		readonly actual: number;
		readonly required: number;
		readonly satisfied: boolean;
		/** Tentative actual including in-progress (omitted when none / unknown). */
		readonly tentativeActual?: number | undefined;
		/** Tentative satisfied including in-progress (drives badge/state). */
		readonly tentativeSatisfied?: boolean | undefined;
		readonly unit?: string;
		readonly class?: string;
		/** Whether to show the label row and remaining text. */
		readonly showLabel?: boolean;
		/** Track thickness: sm=4px (inline/report rows), hero=8px (hero meter). */
		readonly size?: "sm" | "hero";
	}

	const {
		label,
		actual,
		required,
		satisfied,
		tentativeActual,
		tentativeSatisfied,
		unit = "単位",
		class: className = "",
		showLabel = true,
		size = "sm",
	}: Props = $props();

	const trackHeight = $derived(size === "hero" ? "h-2" : "h-1");

	const layout = $derived(
		computeProgressLayout({ actual, required, tentativeActual }),
	);
	const state = $derived(
		resolveProgressState({ satisfied, tentativeSatisfied }),
	);
	const remaining = $derived(Math.max(0, required - actual));
	const inProgressDelta = $derived(
		Math.max(0, layout.tentativeActualOrActual - actual),
	);
	const fillColor = $derived(
		satisfied
			? "bg-[color:var(--color-success-fg)]"
			: "bg-[color:var(--color-accent)]",
	);
	const ariaValueText = $derived(
		layout.hasInProgress
			? m.aria_progress_in_progress({
					actual,
					required,
					unit,
					delta: inProgressDelta,
				})
			: `${actual} / ${required} ${unit}`,
	);
</script>

<div class="space-y-1.5 {className}">
	{#if showLabel}
		<div
			class="flex items-baseline justify-between gap-3 text-caption text-[color:var(--color-fg-muted)]"
		>
			<span class="truncate">{label}</span>
			<span class="tabular-nums">{actual} / {required} {unit}</span>
		</div>
	{/if}
	<div
		role="progressbar"
		aria-label={label}
		aria-valuenow={actual}
		aria-valuemin={0}
		aria-valuemax={required}
		aria-valuetext={ariaValueText}
		class="relative {trackHeight} overflow-hidden rounded-[var(--radius-pill)] bg-[color:var(--color-divider)]"
	>
		{#if layout.hasInProgress}
			<!--
			  In-progress layer: underlay spanning completed→in-progress. Faint Apple
			  Blue with a static diagonal `repeating-linear-gradient` stripe.
			-->
			<div
				class="absolute inset-y-0 left-0 motion-safe:transition-all"
				style={`width: ${layout.tentativePct}%; background-image: repeating-linear-gradient(45deg, var(--color-accent-ring) 0, var(--color-accent-ring) 3px, transparent 3px, transparent 6px); background-color: color-mix(in srgb, var(--color-accent) 14%, transparent);`}
				aria-hidden="true"
			></div>
		{/if}
		<!-- Completed layer: overlaid on the in-progress layer. -->
		<div
			class="absolute inset-y-0 left-0 {fillColor} motion-safe:transition-all"
			style={`width: ${layout.completedPct}%`}
			aria-hidden="true"
		></div>
	</div>
	{#if showLabel}
		{#if state === "in-progress"}
			<p
				class="text-caption text-[color:var(--color-accent-link)]"
				aria-live="polite"
			>
				{m.progress_in_progress_hint({ delta: inProgressDelta, unit })}
			</p>
		{:else if state === "unmet" && remaining > 0}
			<p
				class="text-caption text-[color:var(--color-warning-fg)]"
				aria-live="polite"
			>
				{m.progress_remaining({ remaining, unit })}
			</p>
		{/if}
	{/if}
</div>
