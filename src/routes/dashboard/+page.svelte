<script lang="ts">
	import { base } from "$app/paths";
	import { onMount } from "svelte";
	import { safeGoto } from "$lib/presentation/navigation";
	import RequirementCard from "$lib/presentation/components/RequirementCard.svelte";
	import Summary from "$lib/presentation/components/Summary.svelte";
	import { assessmentStore } from "$lib/presentation/stores/assessment.svelte";
	import { profileStore } from "$lib/presentation/stores/profile.svelte";
	import { transcriptStore } from "$lib/presentation/stores/transcript.svelte";

	onMount(() => {
		if (profileStore.current === null) {
			void safeGoto(`${base}/profile`);
			return;
		}
		if (transcriptStore.current === null) {
			void safeGoto(`${base}/import`);
		}
	});

	const assessment = $derived(assessmentStore.current);
</script>

{#if assessment === null}
	<p class="text-sm text-slate-600">成績データを読み込み中…</p>
{:else}
	<Summary {assessment} />
	<section class="space-y-4">
		<h2 class="text-lg font-semibold">要件ごとの充足状況</h2>
		<div class="grid gap-3 md:grid-cols-2">
			{#each assessment.steps as step (step.id)}
				<RequirementCard id={step.id} label={step.label} result={step.result} />
			{/each}
			<RequirementCard
				id="total-124"
				label="総修得単位"
				result={assessment.total}
			/>
			<RequirementCard
				id="thesis-eligibility"
				label="卒業論文履修資格"
				result={assessment.thesisEligibility}
			/>
		</div>
	</section>
{/if}
