<script lang="ts">
	import { base } from "$app/paths";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { profileStore } from "$lib/presentation/stores/profile.svelte";
	import { transcriptStore } from "$lib/presentation/stores/transcript.svelte";

	onMount(() => {
		if (profileStore.current === null) {
			void goto(`${base}/profile`);
			return;
		}
		if (transcriptStore.current === null) {
			void goto(`${base}/import`);
			return;
		}
		void goto(`${base}/dashboard`);
	});
</script>

<p class="text-sm text-slate-600">リダイレクト中…</p>
