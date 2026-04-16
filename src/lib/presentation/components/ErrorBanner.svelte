<script lang="ts">
	import { AlertTriangle, X } from "lucide-svelte";
	import { errorsStore } from "../stores/errors.svelte.ts";
</script>

{#if errorsStore.current !== null}
	<div
		role="alert"
		class="flex items-start gap-3 border-l-4 border-red-500 bg-red-50 p-4 text-red-900"
	>
		<AlertTriangle class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
		<div class="flex-1">
			<p class="font-semibold">{errorsStore.current.userMessage}</p>
			<p class="mt-1 font-mono text-xs opacity-70">
				code: {errorsStore.current.code}
			</p>
		</div>
		<button
			type="button"
			class="rounded p-1 hover:bg-red-100"
			aria-label="エラーを閉じる"
			onclick={() => errorsStore.clear()}
		>
			<X class="h-4 w-4" />
		</button>
	</div>
{/if}
