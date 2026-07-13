<script lang="ts">
	import { base } from "$app/paths";
	import type { Assessment } from "$lib/application/assessment-types";
	import { Credit } from "$lib/domain/value-objects/credit";
	import Badge from "../ui/Badge.svelte";
	import StatMeter from "../ui/StatMeter.svelte";

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
	// Tentative verdict assuming all in-progress courses pass: even when
	// graduatable=false, tentative.graduatable=true lets us hint "pass everything
	// this term to graduate".
	const tentative = $derived(assessment.tentative);
	const showTentativeHopeful = $derived(
		!assessment.graduatable && tentative !== undefined && tentative.graduatable,
	);

	const verdictTitle = $derived.by(() => {
		if (assessment.graduatable) return "卒業要件を満たしています";
		// If in-progress work (e.g. thesis) would satisfy it, surface that:
		// "will be satisfied" is more accurate and useful than "unmet".
		if (tentative?.graduatable) return "履修中を含めれば卒業要件を満たせます";
		if (totalRemaining > 0) return `卒業要件まであと ${totalRemaining} 単位`;
		return "卒業要件は未充足です";
	});
</script>

<section aria-label="卒業判定サマリ" class="space-y-4">
	<StatMeter
		title={verdictTitle}
		actual={totalNumber}
		required={assessment.totalCreditsRequired}
		satisfied={assessment.total.satisfied}
		tentativeActual={tentative?.total.actual}
		tentativeSatisfied={tentative?.total.satisfied}
		showHint={false}
	>
		{#snippet lead()}
			<p class="text-caption text-[color:var(--color-fg-subtle)]">
				※ この判定は参考情報です。最終確認は<strong
					class="font-medium text-[color:var(--color-fg-muted)]"
					>最新の履修案内・所属学部の教務担当・指導教員</strong
				>で必ず行ってください（<a
					href={`${base}/disclaimer`}
					class="text-[color:var(--color-accent-link)] underline hover:no-underline"
					>免責事項</a
				>）。
			</p>
		{/snippet}
		{#snippet meta()}
			{#if unmetStepCount > 0}
				<span class="text-[color:var(--color-fg-muted)]">
					不足要件
					<span class="font-semibold tabular-nums text-[color:var(--color-fg)]">
						{unmetStepCount}
					</span> 件
				</span>
			{:else if assessment.graduatable}
				<span class="text-[color:var(--color-fg-muted)]">すべての要件を充足</span>
			{/if}
			<span class="inline-flex items-center gap-1.5">
				<span class="text-[color:var(--color-fg-muted)]">卒論資格</span>
				<Badge
					variant={assessment.thesisEligibility.satisfied
						? "success"
						: "warning"}
					dot
				>
					{assessment.thesisEligibility.satisfied ? "資格あり" : "未達"}
				</Badge>
			</span>
			{#if inProgressCount > 0}
				<span class="inline-flex items-center gap-1.5">
					<span class="text-[color:var(--color-fg-muted)]">履修中</span>
					<Badge variant="accent">
						{inProgressCount} 科目 / {inProgressNumber} 単位
					</Badge>
				</span>
			{/if}
		{/snippet}
	</StatMeter>

	{#if showTentativeHopeful}
		<p
			class="rounded-[var(--radius-card)] border border-[color:var(--color-accent-ring)] bg-[color:var(--color-accent-ring)]/40 px-4 py-3 text-small text-[color:var(--color-fg)]"
		>
			履修中の {inProgressCount} 科目（{inProgressNumber} 単位）がすべて合格すれば、すべての要件を満たして卒業可能になります。
		</p>
	{:else if tentative !== undefined && !tentative.graduatable && inProgressCount > 0}
		<p class="text-small text-[color:var(--color-fg-muted)]">
			※ 履修中の {inProgressCount} 科目がすべて合格しても、まだ不足する要件があります。
		</p>
	{/if}
</section>
