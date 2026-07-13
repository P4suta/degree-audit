<script lang="ts">
	import * as m from "$lib/paraglide/messages";
	import Alert from "../ui/Alert.svelte";
	import X from "~icons/ic/round-close";
	import { errorsStore } from "../stores/errors.svelte.ts";
</script>

{#if errorsStore.current !== null}
	{@const current = errorsStore.current}
	<Alert variant="danger" title={current.userMessage}>
		{#snippet actions()}
			<button
				type="button"
				class="inline-flex min-h-8 min-w-8 touch-manipulation items-center justify-center rounded hover:bg-[color:var(--color-danger-border)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-danger)]"
				aria-label={errorsStore.count > 1
					? m.error_dismiss_next()
					: m.error_dismiss()}
				onclick={() => errorsStore.dismiss()}
			>
				<X class="h-4 w-4" aria-hidden="true" />
			</button>
		{/snippet}
		{#if errorsStore.count > 1}
			<p class="text-caption">
				{m.error_more_count({ count: errorsStore.count - 1 })}
			</p>
		{/if}
		<details class="mt-1 text-caption opacity-60">
			<summary class="cursor-pointer select-none">{m.error_dev_info()}</summary>
			<p class="mt-1 font-mono">{current.code}</p>
		</details>
	</Alert>
{/if}
