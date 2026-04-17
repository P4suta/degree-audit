<script lang="ts">
	import { X } from "lucide-svelte";
	import Alert from "../ui/Alert.svelte";
	import { errorsStore } from "../stores/errors.svelte.ts";
</script>

{#if errorsStore.current !== null}
	{@const current = errorsStore.current}
	<Alert variant="danger" title={current.userMessage}>
		{#snippet actions()}
			<button
				type="button"
				class="rounded p-1 hover:bg-[color:var(--color-danger-border)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-danger)]"
				aria-label={errorsStore.count > 1
					? "このエラーを閉じて次のエラーを表示"
					: "エラーを閉じる"}
				onclick={() => errorsStore.dismiss()}
			>
				<X class="h-4 w-4" aria-hidden="true" />
			</button>
		{/snippet}
		<p class="font-mono text-xs opacity-70">code: {current.code}</p>
		{#if errorsStore.count > 1}
			<p class="mt-1 text-xs">
				他に {errorsStore.count - 1} 件のエラーがあります
			</p>
		{/if}
	</Alert>
{/if}
