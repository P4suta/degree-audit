<script lang="ts">
	import { base } from "$app/paths";
	import { page } from "$app/state";
	import CourseList from "$lib/presentation/components/CourseList.svelte";
	import Badge from "$lib/presentation/ui/Badge.svelte";
	import Card from "$lib/presentation/ui/Card.svelte";
	import Progress from "$lib/presentation/ui/Progress.svelte";
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
	class="text-sm text-[color:var(--color-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-surface-muted)]"
>
	&larr; Dashboard へ戻る
</a>

{#if assessment === null}
	<div class="space-y-3" aria-busy="true" aria-label="要件データを読み込み中">
		<div
			class="h-6 w-1/3 motion-safe:animate-pulse rounded bg-[color:var(--color-surface-muted)]"
		></div>
		<div
			class="h-32 w-full motion-safe:animate-pulse rounded-[var(--radius-card)] bg-[color:var(--color-surface-muted)]"
		></div>
		<div
			class="h-24 w-full motion-safe:animate-pulse rounded-[var(--radius-card)] bg-[color:var(--color-surface-muted)]"
		></div>
	</div>
{:else if result() === null}
	<p class="text-sm text-[color:var(--color-fg-muted)]">
		この要件は見つかりませんでした。
	</p>
{:else}
	{@const r = result()}
	{#if r !== null}
		<h2 class="text-xl font-bold text-[color:var(--color-fg)]">{label()}</h2>
		<Card padding="lg">
			<div class="space-y-3">
				<Progress
					label={label()}
					actual={r.actual}
					required={r.required}
					satisfied={r.satisfied}
					unit={r.unit ?? "単位"}
				/>
				<div
					class="flex items-center gap-2 text-sm text-[color:var(--color-fg)]"
				>
					<span class="tabular-nums">
						{r.actual} / {r.required} {r.unit ?? "単位"}
					</span>
					<Badge variant={r.satisfied ? "success" : "warning"}>
						{r.satisfied ? "充足" : "不足"}
					</Badge>
					{#if !r.satisfied && r.required - r.actual > 0}
						<span class="text-[color:var(--color-warning-fg)] font-semibold">
							あと {r.required - r.actual} {r.unit ?? "単位"}
						</span>
					{/if}
				</div>
				{#if r.diagnostics.length > 0}
					<ul class="list-inside list-disc text-sm text-[color:var(--color-fg-muted)]">
						{#each r.diagnostics as d (d)}
							<li>{d}</li>
						{/each}
					</ul>
				{/if}
			</div>
		</Card>

		<section class="space-y-2">
			<h3 class="font-semibold text-[color:var(--color-fg)]">内訳</h3>
			{#if r.subResults.length === 0}
				<Card padding="md" elevation="flat">
					<p class="text-sm text-[color:var(--color-fg-subtle)]">
						この要件には詳細な内訳がありません。
					</p>
				</Card>
			{:else}
				<ul class="space-y-2">
					{#each r.subResults as sub, i (`${sub.required}-${i}`)}
						<li>
							<Card padding="md">
								<div class="flex items-center justify-between gap-3 text-sm">
									<Badge variant={sub.satisfied ? "success" : "warning"}>
										{sub.satisfied ? "✓" : "✗"}
									</Badge>
									<span class="flex-1 text-[color:var(--color-fg)]">
										{sub.actual} / {sub.required}
									</span>
								</div>
								{#if sub.diagnostics.length > 0}
									<ul class="mt-2 list-inside list-disc text-xs text-[color:var(--color-fg-muted)]">
										{#each sub.diagnostics as d (d)}
											<li>{d}</li>
										{/each}
									</ul>
								{/if}
							</Card>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="space-y-2">
			<h3 class="font-semibold text-[color:var(--color-fg)]">貢献科目</h3>
			{#if r.contributingCourses.length === 0}
				<Card padding="md" elevation="flat">
					<p class="text-sm text-[color:var(--color-fg-subtle)]">
						この要件に貢献している科目はまだありません。
					</p>
				</Card>
			{:else}
				<CourseList courses={r.contributingCourses} />
			{/if}
		</section>
	{/if}
{/if}
