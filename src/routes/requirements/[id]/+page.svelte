<script lang="ts">
	import { base } from "$app/paths";
	import { page } from "$app/state";
	import { AcademicRecord } from "$lib/domain/entities/academic-record";
	import type { Course } from "$lib/domain/entities/course";
	import CourseList from "$lib/presentation/components/CourseList.svelte";
	import Badge from "$lib/presentation/ui/Badge.svelte";
	import Disclosure from "$lib/presentation/ui/Disclosure.svelte";
	import StatMeter from "$lib/presentation/ui/StatMeter.svelte";
	import { viewCourseAllocations } from "$lib/application/course-allocation-view";
	import { requirementLabel } from "$lib/presentation/i18n/labels";
	import { resolveProgressState } from "$lib/presentation/ui/progress-layout";
	import { assessmentStore } from "$lib/presentation/stores/assessment.svelte";
	import { transcriptStore } from "$lib/presentation/stores/transcript.svelte";
	import * as m from "$lib/paraglide/messages";
	import ArrowBack from "~icons/ic/round-arrow-back";

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
	const label = $derived(() => requirementLabel(requirementId));

	// tentative: 履修中をすべて合格した場合の同じ要件の評価。
	// current と値が違えば「→ 履修中込みで N」と progress の下に出す
	const tentativeResult = $derived(() => {
		if (assessment === null || assessment.tentative === undefined) return null;
		const t = assessment.tentative;
		if (requirementId === "total-124") return t.total;
		if (requirementId === "thesis-eligibility") return t.thesisEligibility;
		return t.steps.find((s) => s.id === requirementId)?.result ?? null;
	});

	// 各科目の allocation view（natural home vs effective home）
	const allocations = $derived.by(() => {
		if (assessment === null || record === null) return null;
		const passed = new Set(
			AcademicRecord.passedCourses(record).map((c) => c.id as string),
		);
		return viewCourseAllocations(assessment, record.courses, passed);
	});

	// この要件の natural home 科目のうち、他所へ読み替えられたもの。
	// 移動先で算入された（counted）ものと、枠超過で算入外になった（excluded）
	// ものを双方向に一つのリストとして見せる
	interface ReallocatedEntry {
		readonly course: Course;
		readonly destination: string;
		readonly counted: boolean;
		readonly reason: string | null;
	}
	const reallocatedOut = $derived.by(() => {
		if (allocations === null) return [] as ReallocatedEntry[];
		const out: ReallocatedEntry[] = [];
		for (const [, alloc] of allocations) {
			if (alloc.status.naturalHome !== requirementId) continue;
			if (alloc.status.kind === "counted") {
				if (alloc.status.requirementId === requirementId) continue;
				out.push({
					course: alloc.course,
					destination: alloc.status.requirementId,
					counted: true,
					reason: null,
				});
			} else if (alloc.status.kind === "excluded") {
				// elective が 16 単位枠 / 他学部 cap で落としたものも、
				// 元所属から見ると「選択へ読み替えたが算入外」になる。
				// ruleset 差分で elective step id が変わるので、現 assessment の
				// 実際の選択ステップ id を参照する
				const electiveDestId =
					assessment?.steps.find((s) => s.id.startsWith("elective-"))?.id ??
					"elective-38";
				out.push({
					course: alloc.course,
					destination: electiveDestId,
					counted: false,
					reason: alloc.status.reason,
				});
			}
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

	// この要件が natural home の履修中科目。まだ未評価だが、合格すればここに算入
	// される候補。tentative で算入が確定しているものは "→ 算入予定" を出す
	const inProgressForThisReq = $derived.by(() => {
		if (allocations === null) return [] as Course[];
		if (isPipelineStep === false) return [] as Course[];
		const out: Course[] = [];
		for (const [, alloc] of allocations) {
			if (alloc.status.kind !== "in-progress") continue;
			if (alloc.status.naturalHome !== requirementId) continue;
			out.push(alloc.course);
		}
		return out;
	});

	// total-124 / thesis-eligibility 用の一覧（natural home に関係なく全履修中を表示）
	const allInProgressCourses = $derived(
		assessment?.inProgressCourses ?? ([] as readonly Course[]),
	);

	// この要件に「実際に算入されている」科目だけを抜き出す。
	// spec.contributingCourses は kind にマッチした pool 全部を返すので、
	// consume-required で超過した分（＝本来ここが natural home だが下流へ流れた
	// 分）も含まれてしまう。allocation 情報で「この要件が消費した / elective
	// 観察で算入した」ものだけにフィルタする。
	// ただし total-124 / thesis-eligibility は pipeline step ではなく
	// 全 passed courses を評価するもの（読み替え概念は無い）なので、フィルタせず
	// r.contributingCourses をそのまま表示する
	interface ContribEntry {
		readonly course: Course;
		readonly naturalHome: string | null;
		readonly reallocated: boolean;
	}
	const isPipelineStep = $derived(step !== undefined);
	const contributingAnnotated = $derived.by(() => {
		const r = result();
		if (r === null) return [] as ContribEntry[];
		const entries: ContribEntry[] = [];
		for (const c of r.contributingCourses) {
			const alloc = allocations?.get(c.id as string);
			if (isPipelineStep) {
				// 本要件で "counted" 扱いになっているものだけを残す
				if (alloc?.status.kind !== "counted") continue;
				if (alloc.status.requirementId !== requirementId) continue;
				entries.push({
					course: c,
					naturalHome: alloc.status.naturalHome,
					reallocated: alloc.status.reallocated,
				});
			} else {
				// total-124 / thesis-eligibility：そのまま表示
				entries.push({
					course: c,
					naturalHome:
						alloc?.status.kind === "counted"
							? alloc.status.naturalHome
							: (alloc?.status.naturalHome ?? null),
					reallocated: false,
				});
			}
		}
		return entries;
	});

	// ページタイトルは動的。要件名が解決できるまでは汎用タイトル
	const resolvedLabel = $derived(label());
	const pageTitle = $derived(
		resolvedLabel !== "" && resolvedLabel !== requirementId
			? `${resolvedLabel} — ${m.app_title()}`
			: `${m.title_requirement_detail()} — ${m.app_title()}`,
	);
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<a
	href={`${base}/dashboard`}
	class="inline-flex min-h-tap touch-manipulation items-center gap-1 text-small text-[color:var(--color-accent-link)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background)]"
>
	<ArrowBack class="h-4 w-4" aria-hidden="true" />
	{m.back_to_dashboard()}
</a>

{#if assessment === null}
	<div class="space-y-6" aria-busy="true" aria-label={m.requirement_loading()}>
		<div class="space-y-3">
			<div
				class="h-9 w-1/3 motion-safe:animate-pulse rounded-[var(--radius-control)] bg-[color:var(--color-overlay-subtle)]"
			></div>
			<div
				class="h-2 w-full motion-safe:animate-pulse rounded-[var(--radius-pill)] bg-[color:var(--color-overlay-subtle)]"
			></div>
		</div>
		<div
			class="h-40 w-full motion-safe:animate-pulse rounded-[var(--radius-card)] bg-[color:var(--color-overlay-subtle)]"
		></div>
	</div>
{:else if result() === null}
	<p class="text-small text-[color:var(--color-fg-muted)]">
		{m.requirement_not_found()}
	</p>
{:else}
	{@const r = result()}
	{#if r !== null}
		{@const tr = tentativeResult()}
		{@const state = resolveProgressState({
			satisfied: r.satisfied,
			tentativeSatisfied: tr?.satisfied,
		})}
		{@const unit = r.unit ?? "単位"}
		<!-- ヒーロー: 要件名 + 状態 + 大メーター + 現在値。診断は静かな注記に -->
		<section class="space-y-3">
			<StatMeter
				title={label()}
				actual={r.actual}
				required={r.required}
				satisfied={r.satisfied}
				tentativeActual={tr?.actual}
				tentativeSatisfied={tr?.satisfied}
				{unit}
			>
				{#snippet lead()}
					{#if state === "satisfied"}
						<Badge variant="success" dot pill>{m.badge_satisfied()}</Badge>
					{:else if state === "in-progress"}
						<Badge variant="accent" dot pill>{m.badge_in_progress_projected()}</Badge>
					{:else}
						<Badge variant="warning" dot pill>{m.badge_unmet()}</Badge>
					{/if}
				{/snippet}
			</StatMeter>
			{#if state === "unmet" && tr !== null && tr.actual > r.actual}
				<p class="text-small text-[color:var(--color-fg-muted)]">
					{m.requirement_tentative_prefix()}
					<span class="tabular-nums text-[color:var(--color-fg)]">
						{tr.actual} / {tr.required} {unit}
					</span>
				</p>
			{/if}
			{#if r.diagnostics.length > 0}
				<div class="space-y-1">
					{#each r.diagnostics as d (d)}
						<p class="text-small text-[color:var(--color-fg-muted)]">{d}</p>
					{/each}
				</div>
			{/if}
		</section>

		{#if r.subResults.length > 0}
			<section class="space-y-2">
				<h3 class="text-h3 text-[color:var(--color-fg)]">
					{m.requirement_breakdown_heading()}
				</h3>
				<ul
					class="overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] divide-y divide-[color:var(--color-divider)]"
				>
					{#each r.subResults as sub, i (`${sub.required}-${i}`)}
						<li class="space-y-1.5 px-4 py-3 sm:px-5">
							<div
								class="flex items-center justify-between gap-3 text-small text-[color:var(--color-fg)]"
							>
								<span class="tabular-nums">
									{sub.actual} / {sub.required} {sub.unit ?? "単位"}
								</span>
								<Badge variant={sub.satisfied ? "success" : "warning"} dot>
									{sub.satisfied ? m.badge_satisfied() : m.badge_unmet()}
								</Badge>
							</div>
							{#if sub.diagnostics.length > 0}
								<div class="space-y-0.5">
									{#each sub.diagnostics as d (d)}
										<p class="text-caption text-[color:var(--color-fg-muted)]">
											{d}
										</p>
									{/each}
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="space-y-2">
			<h3 class="text-h3 text-[color:var(--color-fg)]">
				{m.requirement_contributing_heading()}
				<span class="text-[color:var(--color-fg-subtle)] tabular-nums">
					({contributingAnnotated.length})
				</span>
			</h3>
			{#if contributingAnnotated.length === 0}
				<p class="text-small text-[color:var(--color-fg-subtle)]">
					{m.requirement_contributing_empty()}
				</p>
			{:else}
				<CourseList
					courses={contributingAnnotated.map((e) => e.course)}
					annotations={contributingAnnotated.map((e) => ({
						course: e.course,
						badge: e.reallocated
							? {
									variant: "accent" as const,
									label: m.badge_natural_home({
										name: requirementLabel(e.naturalHome ?? ""),
									}),
								}
							: null,
					}))}
				/>
			{/if}
		</section>

		{#if isPipelineStep && inProgressForThisReq.length > 0}
			<section class="space-y-2">
				<h3 class="text-h3 text-[color:var(--color-fg)]">
					{m.requirement_in_progress_heading()}
					<span class="text-[color:var(--color-fg-subtle)] tabular-nums">
						({inProgressForThisReq.length})
					</span>
				</h3>
				<p class="text-small text-[color:var(--color-fg-muted)]">
					{m.requirement_in_progress_note()}
				</p>
				<CourseList
					courses={inProgressForThisReq}
					annotations={inProgressForThisReq.map((c) => ({
						course: c,
						badge: { variant: "accent" as const, label: m.badge_in_progress() },
					}))}
				/>
			</section>
		{:else if !isPipelineStep && allInProgressCourses.length > 0}
			<section class="space-y-2">
				<h3 class="text-h3 text-[color:var(--color-fg)]">
					{m.requirement_in_progress_heading()}
					<span class="text-[color:var(--color-fg-subtle)] tabular-nums">
						({allInProgressCourses.length})
					</span>
				</h3>
				<p class="text-small text-[color:var(--color-fg-muted)]">
					{m.requirement_in_progress_note_overall()}
				</p>
				<CourseList
					courses={allInProgressCourses}
					annotations={allInProgressCourses.map((c) => ({
						course: c,
						badge: { variant: "accent" as const, label: m.badge_in_progress() },
					}))}
				/>
			</section>
		{/if}

		<!-- 上級の配分情報は壁にせず、段階開示に畳む -->
		{#if reallocatedOut.length > 0 || (r.excludedCourses && r.excludedCourses.length > 0) || unusedOverflow.length > 0}
			<Disclosure title={m.requirement_allocation_disclosure()}>
				{#if reallocatedOut.length > 0}
					{@const countedCount = reallocatedOut.filter((e) => e.counted).length}
					{@const excludedCount = reallocatedOut.length - countedCount}
					<section class="space-y-2">
						<h3 class="text-h3 text-[color:var(--color-fg)]">
							{m.requirement_reallocated_heading()}
						</h3>
						<p class="text-small text-[color:var(--color-fg-muted)]">
							{m.requirement_reallocated_note_lead()}
							<strong>{m.count_items({ count: countedCount })}</strong>
							{m.requirement_reallocated_counted_mid()}
							{#if excludedCount > 0}
								<strong>{m.count_items({ count: excludedCount })}</strong>
								{m.requirement_reallocated_excluded_suffix()}
							{:else}
								{m.requirement_reallocated_no_excluded()}
							{/if}
						</p>
						<CourseList
							courses={reallocatedOut.map((e) => e.course)}
							annotations={reallocatedOut.map((e) => ({
								course: e.course,
								badge: e.counted
									? {
											variant: "accent" as const,
											label: m.badge_reallocated_to({
												name: requirementLabel(e.destination),
											}),
										}
									: {
											variant: "warning" as const,
											label: m.badge_reallocated_excluded({
												name: requirementLabel(e.destination),
												reason: e.reason ?? m.reason_cap_exceeded(),
											}),
										},
							}))}
						/>
					</section>
				{/if}

				{#if r.excludedCourses && r.excludedCourses.length > 0}
					<section class="space-y-2">
						<h3 class="text-h3 text-[color:var(--color-fg)]">
							{m.requirement_excluded_heading()}
						</h3>
						<p class="text-small text-[color:var(--color-fg-muted)]">
							{m.requirement_excluded_note()}
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
						<h3 class="text-h3 text-[color:var(--color-fg)]">
							{m.requirement_overflow_heading()}
						</h3>
						<p class="text-small text-[color:var(--color-fg-muted)]">
							{m.requirement_overflow_note()}
						</p>
						<CourseList
							courses={unusedOverflow}
							annotations={unusedOverflow.map((c) => ({
								course: c,
								badge: { variant: "neutral" as const, label: m.badge_overflow() },
							}))}
						/>
					</section>
				{/if}
			</Disclosure>
		{/if}
	{/if}
{/if}
