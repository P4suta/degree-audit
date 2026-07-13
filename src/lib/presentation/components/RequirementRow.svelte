<script lang="ts">
	import { base } from "$app/paths";
	import type { SpecResult } from "$lib/application/assessment-types";
	import * as m from "$lib/paraglide/messages";
	import Badge from "../ui/Badge.svelte";
	import { resolveProgressState } from "../ui/progress-layout.ts";
	import ChevronRight from "~icons/ic/round-chevron-right";

	interface Props {
		readonly id: string;
		readonly label: string;
		readonly result: SpecResult;
		readonly tentativeResult?: SpecResult | undefined;
		/** Largest required in the list; used as the shared scale for bar length
		 *  and ticks so fill=earned and empty=remaining read as absolute amounts. */
		readonly maxRequired: number;
	}

	const { id, label, result, tentativeResult, maxRequired }: Props = $props();

	const unit = $derived(result.unit ?? "単位");
	const remaining = $derived(Math.max(0, result.required - result.actual));
	const state = $derived(
		resolveProgressState({
			satisfied: result.satisfied,
			tentativeSatisfied: tentativeResult?.satisfied,
		}),
	);
	const inProgressDelta = $derived(
		tentativeResult === undefined
			? 0
			: Math.max(0, tentativeResult.actual - result.actual),
	);
	// Completion rate (0-100%), capped at 100%.
	const percent = $derived(
		result.required > 0
			? Math.round(Math.min(100, (result.actual / result.required) * 100))
			: 0,
	);
	// Projected rate including in-progress (if all in-progress courses pass).
	const tentativePercent = $derived(
		tentativeResult !== undefined && result.required > 0
			? Math.round(Math.min(100, (tentativeResult.actual / result.required) * 100))
			: percent,
	);

	// All widths on a shared scale (0-maxRequired credits), so
	//   track = this requirement's required, fill = earned, empty = remaining
	// read on the same ruler across rows.
	const base100 = $derived(maxRequired > 0 ? maxRequired : 1);
	const pct = (n: number) => (Math.max(0, n) / base100) * 100;
	const requiredPct = $derived(pct(result.required));
	const actualPct = $derived(pct(Math.min(result.actual, result.required)));
	const tentativePct = $derived(
		pct(
			Math.min(
				Math.max(result.actual, tentativeResult?.actual ?? result.actual),
				result.required,
			),
		),
	);
	const hasInProgress = $derived(tentativePct > actualPct + 0.01);
	// Ticks every 10 credits; the shared scale keeps them aligned across rows.
	const tickPct = $derived((10 / base100) * 100);
	const fillColor = $derived(
		result.satisfied
			? "bg-[color:var(--color-success-fg)]"
			: "bg-[color:var(--color-accent)]",
	);
	const ariaValueText = $derived(
		hasInProgress
			? m.aria_progress_in_progress({
					actual: result.actual,
					required: result.required,
					unit,
					delta: inProgressDelta,
				})
			: `${result.actual} / ${result.required} ${unit}`,
	);
</script>

<!--
  Report row: one line in a rule-separated list. Status dot, requirement name,
  then current value and chevron. The second line is a shared-scale meter
  (ticks + track + earned fill) so credit weight and earned/remaining are legible.
-->
<a
	href={`${base}/requirements/${encodeURIComponent(id)}`}
	class="group block px-4 py-3.5 motion-safe:transition-colors hover:bg-[color:var(--color-overlay-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-accent)] sm:px-5"
>
	<div class="flex items-center gap-3">
		{#if state === "satisfied"}
			<Badge variant="success" dot pill>{m.badge_satisfied()}</Badge>
		{:else if state === "in-progress"}
			<Badge variant="accent" dot pill>{m.badge_in_progress()}</Badge>
		{:else}
			<Badge variant="warning" dot pill>{m.badge_unmet()}</Badge>
		{/if}
		<span
			class="flex-1 min-w-0 truncate text-body-emph text-[color:var(--color-fg)]"
		>
			{label}
		</span>
		<span
			class="shrink-0 text-small tabular-nums text-[color:var(--color-fg-subtle)]"
		>
			<span class="font-semibold text-[color:var(--color-fg)]">{result.actual}</span>
			/ {result.required} {unit}
		</span>
		<ChevronRight
			class="h-5 w-5 shrink-0 text-[color:var(--color-fg-subtle)] motion-safe:transition-colors group-hover:text-[color:var(--color-fg-muted)]"
			aria-hidden="true"
		/>
	</div>

	<div class="mt-2.5 flex items-center gap-3">
		<div
			class="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-[var(--radius-pill)]"
			role="progressbar"
			aria-label={label}
			aria-valuenow={result.actual}
			aria-valuemin={0}
			aria-valuemax={result.required}
			aria-valuetext={ariaValueText}
		>
			<!-- Track: 0-required (this requirement's size). -->
			<div
				class="absolute inset-y-0 left-0 bg-[color:var(--color-overlay-light)]"
				style={`width: ${requiredPct}%`}
				aria-hidden="true"
			></div>
			<!-- In-progress layer: earned→in-progress, faint accent diagonal stripe. -->
			{#if hasInProgress}
				<div
					class="absolute inset-y-0 left-0 motion-safe:transition-all"
					style={`width: ${tentativePct}%; background-image: repeating-linear-gradient(45deg, var(--color-accent-ring) 0, var(--color-accent-ring) 3px, transparent 3px, transparent 6px); background-color: color-mix(in srgb, var(--color-accent) 14%, transparent);`}
					aria-hidden="true"
				></div>
			{/if}
			<!-- Earned fill: 0-earned (absolute length = earned credits). -->
			<div
				class="absolute inset-y-0 left-0 rounded-[var(--radius-pill)] {fillColor} motion-safe:transition-all"
				style={`width: ${actualPct}%`}
				aria-hidden="true"
			></div>
			<!-- Ticks: a ruler marking every 10 credits up to required, kept on top
			     so lengths are measurable across both fill and remaining track. -->
			<div
				class="absolute inset-y-0 left-0"
				style={`width: ${requiredPct}%; background-image: repeating-linear-gradient(to right, var(--color-overlay-medium) 0, var(--color-overlay-medium) 1px, transparent 1px, transparent ${tickPct}%)`}
				aria-hidden="true"
			></div>
		</div>
		<div
			class="flex shrink-0 items-baseline gap-1.5 text-caption tabular-nums"
		>
			{#if hasInProgress}
				<!-- Current % → projected % including in-progress. -->
				<span class="font-medium text-[color:var(--color-fg-subtle)]">{percent}%</span>
				<span class="font-medium text-[color:var(--color-accent-link)]">
					→ {tentativePercent}%
				</span>
			{:else if state === "unmet" && remaining > 0}
				<span class="font-medium text-[color:var(--color-warning-fg)]">
					{m.progress_remaining({ remaining, unit })}
				</span>
				<span class="font-medium text-[color:var(--color-fg-subtle)]">{percent}%</span>
			{:else}
				<span class="font-medium text-[color:var(--color-fg-subtle)]">{percent}%</span>
			{/if}
		</div>
	</div>
</a>
