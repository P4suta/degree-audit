<script lang="ts">
	import { base } from "$app/paths";
	import { onMount } from "svelte";
	import { safeGoto } from "$lib/presentation/navigation";
	import { profileStore } from "$lib/presentation/stores/profile.svelte";
	import { transcriptStore } from "$lib/presentation/stores/transcript.svelte";

	onMount(() => {
		if (profileStore.current === null) {
			void safeGoto(`${base}/profile`);
			return;
		}
		if (transcriptStore.current === null) {
			void safeGoto(`${base}/import`);
			return;
		}
		void safeGoto(`${base}/dashboard`);
	});
</script>

<p class="text-sm text-slate-600">リダイレクト中…</p>
