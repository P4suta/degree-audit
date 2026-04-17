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
	import { resolveProgressState } from "$lib/presentation/ui/progress-layout";
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
				// 元所属から見ると「選択へ読み替えたが算入外」になる
				out.push({
					course: alloc.course,
					destination: "elective-38",
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
</script>

<a
	href={`${base}/dashboard`}
	class="text-sm text-[color:var(--color-accent-link)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background)]"
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
		<h2
			class="text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] text-[color:var(--color-fg)] sm:text-[44px]"
		>
			{label()}
		</h2>
		{@const tr = tentativeResult()}
		{@const state = resolveProgressState({
			satisfied: r.satisfied,
			tentativeSatisfied: tr?.satisfied,
		})}
		{@const inProgressDelta = tr === null ? 0 : Math.max(0, tr.actual - r.actual)}
		<Card padding="lg">
			<div class="space-y-3">
				<Progress
					label={label()}
					actual={r.actual}
					required={r.required}
					satisfied={r.satisfied}
					tentativeActual={tr?.actual}
					tentativeSatisfied={tr?.satisfied}
					unit={r.unit ?? "単位"}
				/>
				<div
					class="flex items-center gap-2 text-sm text-[color:var(--color-fg)]"
				>
					<span class="tabular-nums">
						{r.actual} / {r.required} {r.unit ?? "単位"}
					</span>
					{#if state === "satisfied"}
						<Badge variant="success">充足</Badge>
					{:else if state === "in-progress"}
						<Badge variant="accent" pill>履修中</Badge>
					{:else}
						<Badge variant="warning">不足</Badge>
					{/if}
					{#if state === "in-progress"}
						<span class="text-[color:var(--color-accent-link)] font-semibold">
							履修中 {inProgressDelta} {r.unit ?? "単位"} で充足予定
						</span>
					{:else if state === "unmet" && r.required - r.actual > 0}
						<span class="text-[color:var(--color-warning-fg)] font-semibold">
							あと {r.required - r.actual} {r.unit ?? "単位"}
						</span>
					{/if}
				</div>
				{#if state === "unmet" && tr !== null && tr.actual > r.actual}
					<p class="text-xs text-[color:var(--color-fg-muted)]">
						履修中込み：
						<span class="tabular-nums text-[color:var(--color-fg)]">
							{tr.actual} / {tr.required} {tr.unit ?? "単位"}
						</span>
					</p>
				{/if}
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
				<h3 class="text-[17px] font-semibold leading-[1.24] tracking-[-0.01em] text-[color:var(--color-fg)]">内訳</h3>
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
			<h3 class="text-[17px] font-semibold leading-[1.24] tracking-[-0.01em] text-[color:var(--color-fg)]">貢献科目</h3>
			{#if contributingAnnotated.length === 0}
				<Card padding="md" variant="flat">
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

		{#if isPipelineStep && inProgressForThisReq.length > 0}
			<section class="space-y-2">
				<h3
					class="text-[17px] font-semibold leading-[1.24] tracking-[-0.01em] text-[color:var(--color-fg)]"
				>
					履修中（評価待ち）
				</h3>
				<p class="text-sm text-[color:var(--color-fg-muted)]">
					現時点では算入されていませんが、合格すればこの要件に算入される候補です。
				</p>
				<CourseList
					courses={inProgressForThisReq}
					annotations={inProgressForThisReq.map((c) => ({
						course: c,
						badge: { variant: "accent" as const, label: "履修中" },
					}))}
				/>
			</section>
		{:else if !isPipelineStep && allInProgressCourses.length > 0}
			<section class="space-y-2">
				<h3
					class="text-[17px] font-semibold leading-[1.24] tracking-[-0.01em] text-[color:var(--color-fg)]"
				>
					履修中（評価待ち）
				</h3>
				<p class="text-sm text-[color:var(--color-fg-muted)]">
					現時点の合計には含まれていません。すべて合格した場合の tentative 判定は下のヒント欄で確認できます。
				</p>
				<CourseList
					courses={allInProgressCourses}
					annotations={allInProgressCourses.map((c) => ({
						course: c,
						badge: { variant: "accent" as const, label: "履修中" },
					}))}
				/>
			</section>
		{/if}

		{#if reallocatedOut.length > 0}
			{@const countedCount = reallocatedOut.filter((e) => e.counted).length}
			{@const excludedCount = reallocatedOut.length - countedCount}
			<section class="space-y-2">
				<h3 class="text-[17px] font-semibold leading-[1.24] tracking-[-0.01em] text-[color:var(--color-fg)]">
					ここから読み替え（超過分の行き先）
				</h3>
				<p class="text-sm text-[color:var(--color-fg-muted)]">
					この要件の必要単位を超えた分は選択科目へ読み替え候補になります。
					うち <strong>{countedCount} 件</strong> が実際に算入され、
					{#if excludedCount > 0}
						<strong>{excludedCount} 件</strong> は上限超過で算入外でした。
					{:else}
						算入外はありません。
					{/if}
				</p>
				<CourseList
					courses={reallocatedOut.map((e) => e.course)}
					annotations={reallocatedOut.map((e) => ({
						course: e.course,
						badge: e.counted
							? {
									variant: "accent" as const,
									label: `→ ${requirementDisplayName(e.destination)} で算入`,
								}
							: {
									variant: "warning" as const,
									label: `→ ${requirementDisplayName(e.destination)}（${
										e.reason ?? "上限超過"
									}）`,
								},
					}))}
				/>
			</section>
		{/if}

		{#if r.excludedCourses && r.excludedCourses.length > 0}
			<section class="space-y-2">
				<h3 class="text-[17px] font-semibold leading-[1.24] tracking-[-0.01em] text-[color:var(--color-fg)]">
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
				<h3 class="text-[17px] font-semibold leading-[1.24] tracking-[-0.01em] text-[color:var(--color-fg)]">
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
