<script lang="ts">
	import { base } from "$app/paths";
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
	const inProgressNumber = $derived(
		Credit.toNumber(assessment.inProgressCredits),
	);
	const inProgressCount = $derived(assessment.inProgressCourses.length);
	// 履修中がすべて合格した時の tentative 判定。現在 graduatable=false でも
	// tentative.graduatable=true なら「今期全部通れば卒業できる」ヒントを出せる
	const tentative = $derived(assessment.tentative);
	const showTentativeHopeful = $derived(
		!assessment.graduatable && tentative !== undefined && tentative.graduatable,
	);
</script>

<!--
  Apple 流の hero: 背景なしで大きい見出しを前面に。カードで囲わない。
-->
<section class="space-y-4" aria-label="卒業判定サマリ">
	<h2 class="text-display text-[color:var(--color-fg)]">
		{#if assessment.graduatable}
			卒業要件を満たしています
		{:else}
			卒業要件まであと{totalRemaining > 0 ? ` ${totalRemaining} 単位` : ""}
		{/if}
	</h2>
	<p class="text-xs text-[color:var(--color-fg-subtle)]">
		※ この判定は参考情報です。最終確認は<strong
			class="font-medium text-[color:var(--color-fg-muted)]"
			>最新の履修案内・所属学部の教務担当・指導教員</strong
		>で必ず行ってください（<a
			href={`${base}/disclaimer`}
			class="text-[color:var(--color-accent-link)] underline hover:no-underline"
			>免責事項</a
		>）。
	</p>
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
	<div class="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
		<span class="text-[color:var(--color-fg-muted)]">卒論履修資格</span>
		<Badge
			variant={assessment.thesisEligibility.satisfied ? "success" : "warning"}
		>
			{assessment.thesisEligibility.satisfied ? "資格あり" : "未達"}
		</Badge>
		{#if inProgressCount > 0}
			<span class="w-full text-[color:var(--color-fg-muted)] sm:ml-2 sm:w-auto">
				履修中
			</span>
			<Badge variant="accent">
				{inProgressCount} 科目 / {inProgressNumber} 単位
			</Badge>
		{/if}
	</div>
	{#if showTentativeHopeful}
		<p
			class="rounded-[var(--radius-card)] border border-[color:var(--color-accent-ring)] bg-[color:var(--color-accent-ring)]/40 px-4 py-3 text-sm text-[color:var(--color-fg)]"
		>
			履修中の {inProgressCount} 科目（{inProgressNumber} 単位）がすべて合格すれば、すべての要件を満たして卒業可能になります。
		</p>
	{:else if tentative !== undefined && !tentative.graduatable && inProgressCount > 0}
		<p class="text-sm text-[color:var(--color-fg-muted)]">
			※ 履修中の {inProgressCount} 科目がすべて合格しても、まだ不足する要件があります。
		</p>
	{/if}
</section>
