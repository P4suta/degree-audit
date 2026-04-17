<script lang="ts">
	import type { Assessment } from "$lib/application/assess-graduation";
	import { Credit } from "$lib/domain/value-objects/credit";
	import Badge from "../ui/Badge.svelte";

	interface Props {
		readonly assessment: Assessment;
	}

	const { assessment }: Props = $props();

	const totalNumber = $derived(Credit.toNumber(assessment.totalCredits));
	const totalRemaining = $derived(
		Math.max(0, assessment.totalCreditsRequired - totalNumber),
	);
	const unmetStepCount = $derived(
		assessment.steps.filter((s) => !s.result.satisfied).length +
			(assessment.total.satisfied ? 0 : 1),
	);
</script>

<!--
  Apple 流の hero: 背景なしで大きい見出しを前面に。カードで囲わない。
-->
<section class="space-y-4" aria-label="卒業判定サマリ">
	<h2
		class="text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] text-[color:var(--color-fg)] sm:text-[44px]"
	>
		{#if assessment.graduatable}
			卒業要件を満たしています
		{:else}
			卒業要件まであと{totalRemaining > 0 ? ` ${totalRemaining} 単位` : ""}
		{/if}
	</h2>
	<p class="text-base text-[color:var(--color-fg-muted)]">
		総修得単位
		<span class="font-semibold tabular-nums text-[color:var(--color-fg)]">
			{totalNumber}
		</span>
		/ {assessment.totalCreditsRequired} 単位
		{#if unmetStepCount > 0}
			・不足中の要件
			<span class="font-semibold tabular-nums text-[color:var(--color-fg)]">
				{unmetStepCount}
			</span> 件
		{:else if assessment.graduatable}
			・すべての要件を充足
		{/if}
	</p>
	<div class="flex flex-wrap items-center gap-2 text-sm">
		<span class="text-[color:var(--color-fg-muted)]">卒論履修資格</span>
		<Badge
			variant={assessment.thesisEligibility.satisfied ? "success" : "warning"}
		>
			{assessment.thesisEligibility.satisfied ? "資格あり" : "未達"}
		</Badge>
	</div>
</section>
