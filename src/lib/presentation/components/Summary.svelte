<script lang="ts">
	import { GraduationCap } from "lucide-svelte";
	import type { Assessment } from "$lib/application/assess-graduation";
	import { Credit } from "$lib/domain/value-objects/credit";

	interface Props {
		readonly assessment: Assessment;
	}

	const { assessment }: Props = $props();

	const totalNumber = $derived(Credit.toNumber(assessment.totalCredits));
	const thesisEligibleLabel = $derived(
		assessment.thesisEligibility.satisfied ? "資格あり" : "未達",
	);
</script>

<section
	class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
	aria-label="卒業判定サマリ"
>
	<div class="flex items-center gap-3">
		<GraduationCap
			class={assessment.graduatable ? "h-8 w-8 text-emerald-500" : "h-8 w-8 text-amber-500"}
			aria-hidden="true"
		/>
		<div>
			<p class="text-lg font-bold text-slate-900">
				{assessment.graduatable ? "卒業要件を満たしています" : "卒業要件を満たしていません"}
			</p>
			<p class="text-sm text-slate-600">
				総修得単位 {totalNumber} / {assessment.totalCreditsRequired} 単位
			</p>
		</div>
	</div>
	<div class="mt-4 flex flex-wrap gap-4 text-sm text-slate-700">
		<div>
			卒論履修資格：<span class="font-semibold">{thesisEligibleLabel}</span>
		</div>
		<div>要件ステップ数：{assessment.steps.length}</div>
	</div>
</section>
