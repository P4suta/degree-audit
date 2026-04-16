<script lang="ts">
	import { base } from "$app/paths";
	import { CircleCheck, CircleX } from "lucide-svelte";
	import type { SpecResult } from "$lib/domain/specifications/types";
	import ProgressBar from "./ProgressBar.svelte";

	interface Props {
		readonly id: string;
		readonly label: string;
		readonly result: SpecResult;
	}

	const { id, label, result }: Props = $props();
</script>

<a
	href={`${base}/requirements/${encodeURIComponent(id)}`}
	class="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
>
	<div class="flex items-start justify-between gap-3">
		<h3 class="flex-1 text-base font-semibold text-slate-900">{label}</h3>
		{#if result.satisfied}
			<CircleCheck class="h-5 w-5 shrink-0 text-emerald-500" aria-label="充足" />
		{:else}
			<CircleX class="h-5 w-5 shrink-0 text-amber-500" aria-label="不足" />
		{/if}
	</div>
	<div class="mt-3 space-y-2">
		<ProgressBar
			actual={result.actual}
			required={result.required}
			satisfied={result.satisfied}
		/>
		<p class="text-sm text-slate-600">
			{result.actual} / {result.required}
		</p>
	</div>
</a>
