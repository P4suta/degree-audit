<script lang="ts">
	import GraduationCap from "lucide-svelte/icons/graduation-cap";
	import type { Assessment } from "$lib/application/assess-graduation";
	import { Credit } from "$lib/domain/value-objects/credit";
	import Badge from "../ui/Badge.svelte";
	import Card from "../ui/Card.svelte";

	interface Props {
		readonly assessment: Assessment;
	}

	const { assessment }: Props = $props();

	const totalNumber = $derived(Credit.toNumber(assessment.totalCredits));
	const thesisEligibleLabel = $derived(
		assessment.thesisEligibility.satisfied ? "資格あり" : "未達",
	);
</script>

<Card padding="lg">
	<section aria-label="卒業判定サマリ">
		<div class="flex items-center gap-3">
			<GraduationCap
				class="h-8 w-8 {assessment.graduatable
					? 'text-[color:var(--color-success)]'
					: 'text-[color:var(--color-warning)]'}"
				aria-hidden="true"
			/>
			<div>
				<p class="text-lg font-bold text-[color:var(--color-fg)]">
					{assessment.graduatable
						? "卒業要件を満たしています"
						: "卒業要件を満たしていません"}
				</p>
				<p class="text-sm text-[color:var(--color-fg-muted)]">
					総修得単位 {totalNumber} / {assessment.totalCreditsRequired} 単位
				</p>
			</div>
		</div>
		<div class="mt-4 flex flex-wrap items-center gap-3 text-sm">
			<span class="text-[color:var(--color-fg-muted)]">卒論履修資格：</span>
			<Badge variant={assessment.thesisEligibility.satisfied ? "success" : "warning"}>
				{thesisEligibleLabel}
			</Badge>
			<span class="text-[color:var(--color-fg-muted)]">
				要件ステップ数：{assessment.steps.length}
			</span>
		</div>
	</section>
</Card>
