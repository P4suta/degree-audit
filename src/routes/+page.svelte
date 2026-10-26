<script lang="ts">
	import { resolve } from "$app/paths";
	import { onMount } from "svelte";
	import { safeGoto } from "#lib/presentation/navigation.ts";
	import * as m from "#lib/paraglide/messages.js";
	import { transcriptStore } from "#lib/presentation/stores/transcript.svelte.ts";

	// PDF-only entry: the profile is read from the dropped PDF, so a fresh visit
	// goes straight to import; a loaded transcript goes to the dashboard.
	onMount(() => {
		if (transcriptStore.current === null) {
			void safeGoto(resolve("/import"));
			return;
		}
		void safeGoto(resolve("/dashboard"));
	});
</script>

<p class="text-small text-[color:var(--color-fg-muted)]">{m.redirecting()}</p>
