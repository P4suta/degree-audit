<script lang="ts">
	import {
		computeProgressLayout,
		resolveProgressState,
	} from "./progress-layout.ts";

	interface Props {
		readonly label: string;
		readonly actual: number;
		readonly required: number;
		readonly satisfied: boolean;
		/** 履修中を含めた tentative actual（履修中が無い / 情報が無い場合は省略）。 */
		readonly tentativeActual?: number | undefined;
		/** 履修中を含めた tentative satisfied（badge/state 判定に使う）。 */
		readonly tentativeSatisfied?: boolean | undefined;
		readonly unit?: string;
		readonly class?: string;
		/** ラベル行と残りテキストを出すか（カードの中では true、
		 *  コンパクト表示では false） */
		readonly showLabel?: boolean;
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
	}: Props = $props();

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
			? `${actual} / ${required} ${unit}（履修中 ${inProgressDelta} ${unit}）`
			: `${actual} / ${required} ${unit}`,
	);
</script>

<div class="space-y-1.5 {className}">
	{#if showLabel}
		<div
			class="flex items-baseline justify-between gap-3 text-xs text-[color:var(--color-fg-muted)]"
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
		class="relative h-1 overflow-hidden rounded-[var(--radius-pill)] bg-[color:var(--color-divider)]"
	>
		{#if layout.hasInProgress}
			<!--
			  履修中層: 完了〜履修中まで広がる下敷き。Apple Blue を薄くして
			  `repeating-linear-gradient` で斜線を敷く。stripe は 4px 周期で
			  accent-ring / 透過の繰り返し（動かない）。
			-->
			<div
				class="absolute inset-y-0 left-0 motion-safe:transition-all"
				style={`width: ${layout.tentativePct}%; background-image: repeating-linear-gradient(45deg, var(--color-accent-ring) 0, var(--color-accent-ring) 3px, transparent 3px, transparent 6px); background-color: color-mix(in srgb, var(--color-accent) 14%, transparent);`}
				aria-hidden="true"
			></div>
		{/if}
		<!-- 完了層: 履修中層の上にかぶせる -->
		<div
			class="absolute inset-y-0 left-0 {fillColor} motion-safe:transition-all"
			style={`width: ${layout.completedPct}%`}
			aria-hidden="true"
		></div>
	</div>
	{#if showLabel}
		{#if state === "in-progress"}
			<p
				class="text-xs text-[color:var(--color-accent-link)]"
				aria-live="polite"
			>
				履修中 {inProgressDelta} {unit} で充足予定
			</p>
		{:else if state === "unmet" && remaining > 0}
			<p
				class="text-xs text-[color:var(--color-warning-fg)]"
				aria-live="polite"
			>
				あと {remaining} {unit}
			</p>
		{/if}
	{/if}
</div>
