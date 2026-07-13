<script lang="ts">
	import { base } from "$app/paths";
	import { onMount } from "svelte";
	import { safeGoto } from "$lib/presentation/navigation";
	import RequirementRow from "$lib/presentation/components/RequirementRow.svelte";
	import Summary from "$lib/presentation/components/Summary.svelte";
	import { assessmentStore } from "$lib/presentation/stores/assessment.svelte";
	import { profileStore } from "$lib/presentation/stores/profile.svelte";
	import { transcriptStore } from "$lib/presentation/stores/transcript.svelte";
	import { requirementLabel } from "$lib/presentation/i18n/labels";
	import * as m from "$lib/paraglide/messages";

	// Both profile and transcript come from the same PDF, so if either is
	// missing, go back to import (there is no separate /profile step).
	onMount(() => {
		if (profileStore.current === null || transcriptStore.current === null) {
			void safeGoto(`${base}/import`);
		}
	});

	const assessment = $derived(assessmentStore.current);

	// tentative: the assessment assuming all in-progress courses pass. Used
	// for each requirement row's "projected to be satisfied" judgement.
	const tentativeStepResult = (id: string) =>
		assessment?.tentative?.steps.find((s) => s.id === id)?.result;

	// Baseline for scaling bar length to required credits (the max required in
	// the list). Total (124) is usually the max; each category draws relative to it.
	const maxRequired = $derived.by(() => {
		if (assessment === null) return 1;
		return Math.max(
			1,
			assessment.total.required,
			assessment.thesisEligibility.required,
			...assessment.steps.map((s) => s.result.required),
		);
	});
</script>

<svelte:head>
	<title>{m.title_dashboard()} — {m.app_title()}</title>
</svelte:head>

{#if assessment === null}
	<div class="space-y-8" aria-busy="true" aria-label={m.dashboard_loading()}>
		<div class="space-y-3">
			<div
				class="h-10 w-2/3 motion-safe:animate-pulse rounded-[var(--radius-control)] bg-[color:var(--color-overlay-subtle)]"
			></div>
			<div
				class="h-2 w-full motion-safe:animate-pulse rounded-[var(--radius-pill)] bg-[color:var(--color-overlay-subtle)]"
			></div>
		</div>
		<div
			class="overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--color-border)]"
		>
			{#each Array(5) as _, i (i)}
				<div
					class="h-16 w-full motion-safe:animate-pulse border-b border-[color:var(--color-divider)] bg-[color:var(--color-overlay-subtle)] last:border-b-0"
				></div>
			{/each}
		</div>
	</div>
{:else}
	<Summary {assessment} />
	<section class="space-y-4">
		<h3 class="text-h2 text-[color:var(--color-fg)]">
			{m.dashboard_requirements_heading()}
		</h3>
		<div
			class="overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] divide-y divide-[color:var(--color-divider)]"
		>
			{#each assessment.steps as step (step.id)}
				<RequirementRow
					id={step.id}
					label={requirementLabel(step.id)}
					result={step.result}
					tentativeResult={tentativeStepResult(step.id)}
					{maxRequired}
				/>
			{/each}
			<div
				class="bg-[color:var(--color-overlay-subtle)] px-4 py-2 sm:px-5"
			>
				<span
					class="text-caption font-medium text-[color:var(--color-fg-subtle)]"
				>
					{m.dashboard_section_overall()}
				</span>
			</div>
			<RequirementRow
				id="total-124"
				label={requirementLabel("total-124")}
				result={assessment.total}
				tentativeResult={assessment.tentative?.total}
				{maxRequired}
			/>
			<RequirementRow
				id="thesis-eligibility"
				label={requirementLabel("thesis-eligibility")}
				result={assessment.thesisEligibility}
				tentativeResult={assessment.tentative?.thesisEligibility}
				{maxRequired}
			/>
		</div>
	</section>
{/if}
