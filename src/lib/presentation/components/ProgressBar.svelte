<!--
  後方互換のためのシム（ラベル無しのバー単体）。
  新コードはラベル付きバーが欲しければ `$lib/presentation/ui/Progress.svelte`
  を直接 import する。
-->
<script lang="ts">
	interface Props {
		readonly label: string;
		readonly actual: number;
		readonly required: number;
		readonly satisfied: boolean;
		readonly unit?: string;
	}

	const { label, actual, required, satisfied, unit = "単位" }: Props = $props();

	const percent = $derived(
		required === 0
			? 100
			: Math.min(100, Math.max(0, (actual / required) * 100)),
	);
</script>

<div
	role="progressbar"
	aria-label="{label}: {actual} / {required} {unit}"
	aria-valuenow={actual}
	aria-valuemin={0}
	aria-valuemax={required}
	class="h-2 w-full overflow-hidden rounded-full bg-[color:var(--color-surface-muted)]"
>
	<div
		class="h-full motion-safe:transition-all {satisfied
			? 'bg-[color:var(--color-success)]'
			: 'bg-[color:var(--color-accent)]'}"
		style="width: {percent}%"
	></div>
</div>
