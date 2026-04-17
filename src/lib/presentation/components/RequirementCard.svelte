<script lang="ts">
	import { base } from "$app/paths";
	import { CircleCheck, CircleX } from "lucide-svelte";
	import type { SpecResult } from "$lib/domain/specifications/types";
	import Badge from "../ui/Badge.svelte";
	import Progress from "../ui/Progress.svelte";

	interface Props {
		readonly id: string;
		readonly label: string;
		readonly result: SpecResult;
	}

	const { id, label, result }: Props = $props();
</script>

<a
	href={`${base}/requirements/${encodeURIComponent(id)}`}
	class="group block rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-card)] motion-safe:transition hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-surface-muted)]"
>
	<div class="flex items-start justify-between gap-3">
		<h3 class="flex-1 text-base font-semibold text-[color:var(--color-fg)]">
			{label}
		</h3>
		{#if result.satisfied}
			<Badge variant="success">
				<CircleCheck class="h-3.5 w-3.5" aria-hidden="true" />
				充足
			</Badge>
		{:else}
			<Badge variant="warning">
				<CircleX class="h-3.5 w-3.5" aria-hidden="true" />
				不足
			</Badge>
		{/if}
	</div>
	<div class="mt-3">
		<Progress
			{label}
			actual={result.actual}
			required={result.required}
			satisfied={result.satisfied}
		/>
	</div>
</a>
