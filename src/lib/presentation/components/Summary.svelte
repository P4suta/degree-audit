<script lang="ts">
	import { base } from "$app/paths";
	import type { Assessment } from "$lib/application/assessment-types";
	import { Credit } from "$lib/domain/value-objects/credit";
	import * as m from "$lib/paraglide/messages";
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
		if (assessment.graduatable) return m.summary_verdict_graduatable();
		// If in-progress work (e.g. thesis) would satisfy it, surface that:
		// "will be satisfied" is more accurate and useful than "unmet".
		if (tentative?.graduatable) return m.summary_verdict_projected();
		if (totalRemaining > 0)
			return m.summary_verdict_remaining({ credits: totalRemaining });
		return m.summary_verdict_unmet();
	});
</script>

<section aria-label={m.summary_region_label()} class="space-y-4">
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
				{m.summary_note_lead()}<strong
					class="font-medium text-[color:var(--color-fg-muted)]"
					>{m.summary_note_strong()}</strong
				>{m.summary_note_mid()}<a
					href={`${base}/disclaimer`}
					class="text-[color:var(--color-accent-link)] underline hover:no-underline"
					>{m.link_disclaimer()}</a
				>{m.summary_note_trail()}
			</p>
		{/snippet}
		{#snippet meta()}
			{#if unmetStepCount > 0}
				<span class="text-[color:var(--color-fg-muted)]">
					{m.summary_unmet_prefix()}
					<span class="font-semibold tabular-nums text-[color:var(--color-fg)]">
						{unmetStepCount}
					</span> {m.count_ken()}
				</span>
			{:else if assessment.graduatable}
				<span class="text-[color:var(--color-fg-muted)]">{m.summary_all_satisfied()}</span>
			{/if}
			<span class="inline-flex items-center gap-1.5">
				<span class="text-[color:var(--color-fg-muted)]">{m.summary_thesis_label()}</span>
				<Badge
					variant={assessment.thesisEligibility.satisfied
						? "success"
						: "warning"}
					dot
				>
					{assessment.thesisEligibility.satisfied
						? m.summary_thesis_eligible()
						: m.summary_thesis_not_eligible()}
				</Badge>
			</span>
			{#if inProgressCount > 0}
				<span class="inline-flex items-center gap-1.5">
					<span class="text-[color:var(--color-fg-muted)]">{m.badge_in_progress()}</span>
					<Badge variant="accent">
						{m.summary_in_progress_count({
							courses: inProgressCount,
							credits: inProgressNumber,
						})}
					</Badge>
				</span>
			{/if}
		{/snippet}
	</StatMeter>

	{#if showTentativeHopeful}
		<p
			class="rounded-[var(--radius-card)] border border-[color:var(--color-accent-ring)] bg-[color:var(--color-accent-ring)]/40 px-4 py-3 text-small text-[color:var(--color-fg)]"
		>
			{m.summary_tentative_hopeful({
				courses: inProgressCount,
				credits: inProgressNumber,
			})}
		</p>
	{:else if tentative !== undefined && !tentative.graduatable && inProgressCount > 0}
		<p class="text-small text-[color:var(--color-fg-muted)]">
			{m.summary_tentative_insufficient({ courses: inProgressCount })}
		</p>
	{/if}
</section>
