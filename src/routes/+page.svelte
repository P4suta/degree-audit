<script lang="ts">
	import { base } from "$app/paths";
	import { onMount } from "svelte";
	import { safeGoto } from "$lib/presentation/navigation";
	import { transcriptStore } from "$lib/presentation/stores/transcript.svelte";

	// PDF-only entry: the profile is read from the dropped PDF, so a fresh visit
	// goes straight to import; a loaded transcript goes to the dashboard.
	onMount(() => {
		if (transcriptStore.current === null) {
			void safeGoto(`${base}/import`);
			return;
		}
		void safeGoto(`${base}/dashboard`);
	});
</script>

<p class="text-small text-[color:var(--color-fg-muted)]">リダイレクト中…</p>
