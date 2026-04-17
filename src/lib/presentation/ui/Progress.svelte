<script lang="ts">
	interface Props {
		readonly label: string;
		readonly actual: number;
		readonly required: number;
		readonly satisfied: boolean;
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
		unit = "単位",
		class: className = "",
		showLabel = true,
	}: Props = $props();

	const ratio = $derived(
		required === 0 ? 0 : Math.min(1, Math.max(0, actual / required)),
	);
	const percent = $derived(`${Math.round(ratio * 100)}%`);
	const remaining = $derived(Math.max(0, required - actual));

	// Apple 流: satisfied は落ち着いた緑、未充足は Apple Blue（アクセント）
	const trackColor = $derived(
		satisfied
			? "bg-[color:var(--color-success-fg)]"
			: "bg-[color:var(--color-accent)]",
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
		aria-label="{label}: {actual} / {required} {unit}"
		aria-valuenow={actual}
		aria-valuemin={0}
		aria-valuemax={required}
		class="h-1 overflow-hidden rounded-[var(--radius-pill)] bg-[color:var(--color-divider)]"
	>
		<div
			class="h-full {trackColor} motion-safe:transition-all"
			style={`width: ${percent}`}
		></div>
	</div>
	{#if showLabel && !satisfied && remaining > 0}
		<p
			class="text-xs text-[color:var(--color-warning-fg)]"
			aria-live="polite"
		>
			あと {remaining} {unit}
		</p>
	{/if}
</div>
