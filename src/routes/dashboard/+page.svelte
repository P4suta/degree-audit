<script lang="ts">
	import { base } from "$app/paths";
	import { onMount } from "svelte";
	import { safeGoto } from "$lib/presentation/navigation";
	import RequirementCard from "$lib/presentation/components/RequirementCard.svelte";
	import Summary from "$lib/presentation/components/Summary.svelte";
	import { assessmentStore } from "$lib/presentation/stores/assessment.svelte";
	import { profileStore } from "$lib/presentation/stores/profile.svelte";
	import { skippedStore } from "$lib/presentation/stores/skipped.svelte";
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

	// tentative: 履修中をすべて合格した場合の assessment。各要件カードの
	// 「履修中込みで充足予定」判定に使う
	const tentativeStepResult = (id: string) =>
		assessment?.tentative?.steps.find((s) => s.id === id)?.result;
</script>

{#if assessment === null}
	<div class="space-y-4" aria-busy="true" aria-label="成績データを読み込み中">
		<div
			class="h-24 w-full motion-safe:animate-pulse rounded-[var(--radius-card)] bg-[color:var(--color-surface-muted)]"
		></div>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each Array(6) as _, i (i)}
				<div
					class="h-28 w-full motion-safe:animate-pulse rounded-[var(--radius-card)] bg-[color:var(--color-surface-muted)]"
				></div>
			{/each}
		</div>
	</div>
{:else}
	{#if skippedStore.count > 0}
		<a
			href={`${base}/import`}
			class="block rounded-[var(--radius-control)] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] p-3 text-sm text-[color:var(--color-warning-fg)] motion-safe:transition-colors hover:brightness-95"
		>
			{skippedStore.count} 件の科目が解析できずスキップされています。
			<span class="underline">取り込み画面で詳細を確認する</span>
		</a>
	{/if}
	<Summary {assessment} />
	<section class="space-y-4">
		<h2
			class="text-[22px] font-semibold leading-[1.18] tracking-[-0.015em] text-[color:var(--color-fg)]"
		>
			要件ごとの充足状況
		</h2>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each assessment.steps as step (step.id)}
				<RequirementCard
					id={step.id}
					label={step.label}
					result={step.result}
					tentativeResult={tentativeStepResult(step.id)}
				/>
			{/each}
			<RequirementCard
				id="total-124"
				label="総修得単位"
				result={assessment.total}
				tentativeResult={assessment.tentative?.total}
			/>
			<RequirementCard
				id="thesis-eligibility"
				label="卒業論文履修資格"
				result={assessment.thesisEligibility}
				tentativeResult={assessment.tentative?.thesisEligibility}
			/>
		</div>
	</section>
{/if}
