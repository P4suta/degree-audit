<script lang="ts">
	import { base } from "$app/paths";
	import { page } from "$app/state";
	import CourseList from "$lib/presentation/components/CourseList.svelte";
	import ProgressBar from "$lib/presentation/components/ProgressBar.svelte";
	import { assessmentStore } from "$lib/presentation/stores/assessment.svelte";

	const requirementId = $derived(page.params["id"] ?? "");
	const assessment = $derived(assessmentStore.current);

	const step = $derived(
		assessment?.steps.find((s) => s.id === requirementId),
	);
	const result = $derived(() => {
		if (assessment === null) return null;
		if (requirementId === "total-124") return assessment.total;
		if (requirementId === "thesis-eligibility")
			return assessment.thesisEligibility;
		return step?.result ?? null;
	});
	const label = $derived(() => {
		if (requirementId === "total-124") return "総修得単位";
		if (requirementId === "thesis-eligibility") return "卒業論文履修資格";
		return step?.label ?? requirementId;
	});
</script>

<a
	href={`${base}/dashboard`}
	class="text-sm text-sky-700 hover:underline"
>
	&larr; Dashboard へ戻る
</a>

{#if assessment === null}
	<p class="text-sm text-slate-600">成績データが読み込まれていません。</p>
{:else if result() === null}
	<p class="text-sm text-slate-600">この要件は見つかりませんでした。</p>
{:else}
	{@const r = result()}
	{#if r !== null}
		<h2 class="text-xl font-bold">{label()}</h2>
		<section class="space-y-3 rounded-lg border border-slate-200 bg-white p-6">
			<ProgressBar
				actual={r.actual}
				required={r.required}
				satisfied={r.satisfied}
			/>
			<p class="text-sm text-slate-700">
				{r.actual} / {r.required}
				{#if r.satisfied}
					<span class="ml-2 text-emerald-700">充足</span>
				{:else}
					<span class="ml-2 text-amber-700">不足</span>
				{/if}
			</p>
			{#if r.diagnostics.length > 0}
				<ul class="list-inside list-disc text-sm text-slate-700">
					{#each r.diagnostics as d (d)}
						<li>{d}</li>
					{/each}
				</ul>
			{/if}
		</section>

		{#if r.subResults.length > 0}
			<section class="space-y-2">
				<h3 class="font-semibold text-slate-900">内訳</h3>
				<ul class="space-y-2">
					{#each r.subResults as sub, i (`${sub.required}-${i}`)}
						<li class="rounded-lg border border-slate-200 bg-white p-4">
							<div class="flex items-center justify-between gap-3 text-sm">
								<span class="font-medium">
									{#if sub.satisfied}
										<span class="text-emerald-700">✓</span>
									{:else}
										<span class="text-amber-700">✗</span>
									{/if}
								</span>
								<span class="flex-1 text-slate-700">
									{sub.actual} / {sub.required}
								</span>
							</div>
							{#if sub.diagnostics.length > 0}
								<ul class="mt-2 list-inside list-disc text-xs text-slate-600">
									{#each sub.diagnostics as d (d)}
										<li>{d}</li>
									{/each}
								</ul>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="space-y-2">
			<h3 class="font-semibold text-slate-900">貢献科目</h3>
			<CourseList courses={r.contributingCourses} />
		</section>
	{/if}
{/if}
