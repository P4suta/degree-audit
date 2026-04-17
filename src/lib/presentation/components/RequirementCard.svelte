<script lang="ts">
	import { base } from "$app/paths";
	import type { SpecResult } from "$lib/domain/specifications/types";
	import Badge from "../ui/Badge.svelte";
	import Progress from "../ui/Progress.svelte";

	interface Props {
		readonly id: string;
		readonly label: string;
		readonly result: SpecResult;
	}

	const { id, label, result }: Props = $props();

	const remaining = $derived(Math.max(0, result.required - result.actual));
	const unit = $derived(result.unit ?? "単位");
</script>

<!--
  Apple 流: カードは境界だけで区切る。影なし。
  hover で背景をわずかに持ち上げる程度の反応。
-->
<a
	href={`${base}/requirements/${encodeURIComponent(id)}`}
	class="group block rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 motion-safe:transition-colors hover:bg-[color:var(--color-surface-alt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background)]"
>
	<div class="flex items-start justify-between gap-3">
		<h3
			class="flex-1 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[color:var(--color-fg)]"
		>
			{label}
		</h3>
		{#if result.satisfied}
			<Badge variant="success">充足</Badge>
		{:else}
			<Badge variant="warning">不足</Badge>
		{/if}
	</div>
	<div class="mt-4 space-y-1.5">
		<Progress
			{label}
			actual={result.actual}
			required={result.required}
			satisfied={result.satisfied}
			{unit}
			showLabel={false}
		/>
		<div
			class="flex items-baseline justify-between gap-3 text-xs text-[color:var(--color-fg-muted)]"
		>
			<span class="tabular-nums">
				{result.actual} / {result.required} {unit}
			</span>
			{#if !result.satisfied && remaining > 0}
				<span
					class="font-medium text-[color:var(--color-warning-fg)] tabular-nums"
				>
					あと {remaining} {unit}
				</span>
			{/if}
		</div>
	</div>
</a>
