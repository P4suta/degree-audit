<script lang="ts">
	import { base } from "$app/paths";
	import { page } from "$app/state";
	import { AcademicRecord } from "$lib/domain/entities/academic-record";
	import type { Course } from "$lib/domain/entities/course";
	import CourseList from "$lib/presentation/components/CourseList.svelte";
	import Badge from "$lib/presentation/ui/Badge.svelte";
	import Card from "$lib/presentation/ui/Card.svelte";
	import Progress from "$lib/presentation/ui/Progress.svelte";
	import {
		requirementDisplayName,
		viewCourseAllocations,
	} from "$lib/application/course-allocation-view";
	import { assessmentStore } from "$lib/presentation/stores/assessment.svelte";
	import { transcriptStore } from "$lib/presentation/stores/transcript.svelte";

	const requirementId = $derived(page.params["id"] ?? "");
	const assessment = $derived(assessmentStore.current);
	const record = $derived(transcriptStore.current);

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

	// 各科目の allocation view（natural home vs effective home）
	const allocations = $derived.by(() => {
		if (assessment === null || record === null) return null;
		const passed = new Set(
			AcademicRecord.passedCourses(record).map((c) => c.id as string),
		);
		return viewCourseAllocations(assessment, record.courses, passed);
	});

	// この要件の natural home 科目のうち、他所で算入されたもの（＝読み替え先）
	const reallocatedOut = $derived.by(() => {
		if (allocations === null) return [] as Array<{
			course: Course;
			consumedBy: string;
		}>;
		const out: Array<{ course: Course; consumedBy: string }> = [];
		for (const [, alloc] of allocations) {
			if (alloc.status.kind !== "counted") continue;
			if (alloc.status.naturalHome !== requirementId) continue;
			if (alloc.status.requirementId === requirementId) continue;
			out.push({
				course: alloc.course,
				consumedBy: alloc.status.requirementId,
			});
		}
		return out;
	});

	// 要件を満たしたが、どこにも算入されなかった余り（例：教養 42 のうち 28 超過分の 14）
	const unusedOverflow = $derived.by(() => {
		if (allocations === null) return [] as Course[];
		const out: Course[] = [];
		for (const [, alloc] of allocations) {
			if (alloc.status.kind !== "unused-overflow") continue;
			if (alloc.status.naturalHome !== requirementId) continue;
			out.push(alloc.course);
		}
		return out;
	});

	// 貢献科目のうち「natural home が違う = 読み替えて来た」ものと、元から当該要件の科目
	interface ContribEntry {
		readonly course: Course;
		readonly naturalHome: string | null;
		readonly reallocated: boolean;
	}
	const contributingAnnotated = $derived.by(() => {
		const r = result();
		if (r === null) return [] as ContribEntry[];
		const entries: ContribEntry[] = [];
		for (const c of r.contributingCourses) {
			const alloc = allocations?.get(c.id as string);
			const naturalHome =
				alloc?.status.kind === "counted"
					? alloc.status.naturalHome
					: (alloc?.status.naturalHome ?? null);
			const reallocated =
				alloc?.status.kind === "counted" ? alloc.status.reallocated : false;
			entries.push({ course: c, naturalHome, reallocated });
		}
		return entries;
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
					<ul
						class="list-inside list-disc text-sm text-[color:var(--color-fg-muted)]"
					>
						{#each r.diagnostics as d (d)}
							<li>{d}</li>
						{/each}
					</ul>
				{/if}
			</div>
		</Card>

		{#if r.subResults.length > 0}
			<section class="space-y-2">
				<h3 class="font-semibold text-[color:var(--color-fg)]">内訳</h3>
				<ul class="space-y-2">
					{#each r.subResults as sub, i (`${sub.required}-${i}`)}
						<li>
							<Card padding="md">
								<div class="flex items-center justify-between gap-3 text-sm">
									<Badge variant={sub.satisfied ? "success" : "warning"}>
										{sub.satisfied ? "✓" : "✗"}
									</Badge>
									<span class="flex-1 text-[color:var(--color-fg)]">
										{sub.actual} / {sub.required} {sub.unit ?? "単位"}
									</span>
								</div>
								{#if sub.diagnostics.length > 0}
									<ul
										class="mt-2 list-inside list-disc text-xs text-[color:var(--color-fg-muted)]"
									>
										{#each sub.diagnostics as d (d)}
											<li>{d}</li>
										{/each}
									</ul>
								{/if}
							</Card>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="space-y-2">
			<h3 class="font-semibold text-[color:var(--color-fg)]">貢献科目</h3>
			{#if contributingAnnotated.length === 0}
				<Card padding="md" elevation="flat">
					<p class="text-sm text-[color:var(--color-fg-subtle)]">
						この要件に貢献している科目はまだありません。
					</p>
				</Card>
			{:else}
				<CourseList
					courses={contributingAnnotated.map((e) => e.course)}
					annotations={contributingAnnotated.map((e) => ({
						course: e.course,
						badge: e.reallocated
							? {
									variant: "accent" as const,
									label: `本来：${requirementDisplayName(e.naturalHome ?? "")}`,
								}
							: null,
					}))}
				/>
			{/if}
		</section>

		{#if reallocatedOut.length > 0}
			<section class="space-y-2">
				<h3 class="font-semibold text-[color:var(--color-fg)]">
					ここから読み替え（他要件で算入）
				</h3>
				<p class="text-sm text-[color:var(--color-fg-muted)]">
					この要件の必要単位を超えた分は、以下の科目として他の要件で算入されています。
				</p>
				<CourseList
					courses={reallocatedOut.map((e) => e.course)}
					annotations={reallocatedOut.map((e) => ({
						course: e.course,
						badge: {
							variant: "accent" as const,
							label: `→ ${requirementDisplayName(e.consumedBy)}`,
						},
					}))}
				/>
			</section>
		{/if}

		{#if r.excludedCourses && r.excludedCourses.length > 0}
			<section class="space-y-2">
				<h3 class="font-semibold text-[color:var(--color-fg)]">
					算入外（上限超過）
				</h3>
				<p class="text-sm text-[color:var(--color-fg-muted)]">
					上限に達したため、この要件には算入できなかった科目です。
				</p>
				<CourseList
					courses={r.excludedCourses.map((e) => e.course)}
					annotations={r.excludedCourses.map((e) => ({
						course: e.course,
						badge: { variant: "warning" as const, label: e.reason },
					}))}
				/>
			</section>
		{/if}

		{#if unusedOverflow.length > 0}
			<section class="space-y-2">
				<h3 class="font-semibold text-[color:var(--color-fg)]">
					要件超過（卒業単位には使われず）
				</h3>
				<p class="text-sm text-[color:var(--color-fg-muted)]">
					この要件の必要単位を超えて取得した科目のうち、他の要件にも読み替えられなかったものです。
				</p>
				<CourseList
					courses={unusedOverflow}
					annotations={unusedOverflow.map((c) => ({
						course: c,
						badge: { variant: "neutral" as const, label: "要件超過" },
					}))}
				/>
			</section>
		{/if}
	{/if}
{/if}
