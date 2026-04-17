<script lang="ts" module>
	const timers = new Map<string, ReturnType<typeof setTimeout>>();
</script>

<script lang="ts">
	import X from "lucide-svelte/icons/x";
	import Alert from "../ui/Alert.svelte";
	import type { Warning } from "../stores/warnings.svelte.ts";
	import { warningsStore } from "../stores/warnings.svelte.ts";

	const scheduleDismiss = (warning: Warning): void => {
		if (warning.autoDismissMs === undefined) return;
		const existing = timers.get(warning.id);
		if (existing !== undefined) clearTimeout(existing);
		const handle = setTimeout(() => {
			warningsStore.dismiss(warning.id);
			timers.delete(warning.id);
		}, warning.autoDismissMs);
		timers.set(warning.id, handle);
	};

	const cancelDismiss = (id: string): void => {
		const existing = timers.get(id);
		if (existing !== undefined) clearTimeout(existing);
		timers.delete(id);
	};

	$effect(() => {
		for (const w of warningsStore.items) {
			if (w.autoDismissMs !== undefined && !timers.has(w.id)) {
				scheduleDismiss(w);
			}
		}
		const liveIds = new Set(warningsStore.items.map((w) => w.id));
		for (const id of [...timers.keys()]) {
			if (!liveIds.has(id)) cancelDismiss(id);
		}
	});
</script>

{#if warningsStore.items.length > 0}
	<div class="space-y-2">
		{#each warningsStore.items as warning (warning.id)}
			<div
				role="presentation"
				onpointerenter={() => cancelDismiss(warning.id)}
				onpointerleave={() => scheduleDismiss(warning)}
				onfocusin={() => cancelDismiss(warning.id)}
				onfocusout={() => scheduleDismiss(warning)}
			>
				<Alert variant="warning">
					{#snippet actions()}
						<button
							type="button"
							class="rounded p-1 hover:bg-[color:var(--color-warning-border)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-warning)]"
							aria-label="警告を閉じる"
							onclick={() => warningsStore.dismiss(warning.id)}
						>
							<X class="h-4 w-4" aria-hidden="true" />
						</button>
					{/snippet}
					{warning.message}
				</Alert>
			</div>
		{/each}
	</div>
{/if}
