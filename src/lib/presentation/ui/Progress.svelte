<script lang="ts">
	interface Props {
		readonly label: string;
		readonly actual: number;
		readonly required: number;
		readonly satisfied: boolean;
		readonly unit?: string;
		readonly class?: string;
	}

	const {
		label,
		actual,
		required,
		satisfied,
		unit = "単位",
		class: className = "",
	}: Props = $props();

	const ratio = $derived(
		required === 0 ? 0 : Math.min(1, Math.max(0, actual / required)),
	);

	const percent = $derived(`${Math.round(ratio * 100)}%`);

	const trackColor = $derived(
		satisfied
			? "bg-[color:var(--color-success)]"
			: "bg-[color:var(--color-accent)]",
	);

	const remaining = $derived(Math.max(0, required - actual));
</script>

<div class="space-y-1 {className}">
	<div
		class="flex items-baseline justify-between gap-3 text-xs text-[color:var(--color-fg-muted)]"
	>
		<span class="truncate">{label}</span>
		<span class="tabular-nums">{actual} / {required} {unit}</span>
	</div>
	<div
		role="progressbar"
		aria-label="{label}: {actual} / {required} {unit}"
		aria-valuenow={actual}
		aria-valuemin={0}
		aria-valuemax={required}
		class="h-2 overflow-hidden rounded-full bg-[color:var(--color-surface-muted)]"
	>
		<div
			class="h-full {trackColor} motion-safe:transition-all"
			style={`width: ${percent}`}
		></div>
	</div>
	{#if !satisfied && remaining > 0}
		<p
			class="text-xs font-medium text-[color:var(--color-warning-fg)]"
			aria-live="polite"
		>
			あと {remaining} {unit}
		</p>
	{/if}
</div>
