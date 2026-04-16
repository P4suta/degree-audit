<script lang="ts">
	import { Info, X } from "lucide-svelte";
	import { warningsStore } from "../stores/warnings.svelte.ts";
</script>

{#if warningsStore.items.length > 0}
	<div class="space-y-2">
		{#each warningsStore.items as warning (warning.id)}
			<div
				role="status"
				class="flex items-start gap-3 border-l-4 border-amber-400 bg-amber-50 p-3 text-amber-900"
			>
				<Info class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
				<p class="flex-1 text-sm">{warning.message}</p>
				<button
					type="button"
					class="rounded p-1 hover:bg-amber-100"
					aria-label="警告を閉じる"
					onclick={() => warningsStore.dismiss(warning.id)}
				>
					<X class="h-4 w-4" />
				</button>
			</div>
		{/each}
	</div>
{/if}
