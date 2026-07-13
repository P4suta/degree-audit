<script lang="ts">
	import type { Snippet } from "svelte";
	import Progress from "./Progress.svelte";
	import { resolveProgressState } from "./progress-layout.ts";

	/**
	 * ヒーロー用のメーターブロック。大見出し（verdict / 要件名）＋太いメーター＋
	 * 数値リードアウト＋補助スロットを 1 かたまりにする。Dashboard の全体進捗と
	 * 要件詳細の要件進捗で共用する。カードで囲わず、余白と階層で前に出す。
	 */
	interface Props {
		/** 大見出し（卒業判定の verdict、または要件名）。 */
		readonly title: string;
		readonly actual: number;
		readonly required: number;
		readonly satisfied: boolean;
		readonly tentativeActual?: number | undefined;
		readonly tentativeSatisfied?: boolean | undefined;
		readonly unit?: string;
		/** 見出しの直下・メーターの上に出る補助行（ステータス badge・注記など）。 */
		readonly lead?: Snippet;
		/** リードアウト行の下に出るメタ情報（badge 群など）。 */
		readonly meta?: Snippet;
		/** リードアウト右の「あと N / 履修中」ヒントを出すか（見出しが残数を
		 *  述べている場合は false で重複を避ける）。 */
		readonly showHint?: boolean;
	}

	const {
		title,
		actual,
		required,
		satisfied,
		tentativeActual,
		tentativeSatisfied,
		unit = "単位",
		lead,
		meta,
		showHint = true,
	}: Props = $props();

	const state = $derived(
		resolveProgressState({ satisfied, tentativeSatisfied }),
	);
	const remaining = $derived(Math.max(0, required - actual));
	const inProgressDelta = $derived(
		tentativeActual === undefined ? 0 : Math.max(0, tentativeActual - actual),
	);
	// 達成率（0〜100%）。超過は 100% で頭打ち。
	const pct = $derived(
		required > 0 ? Math.round(Math.min(100, (actual / required) * 100)) : 0,
	);
	// 履修中込みの見込み達成率と、その差分があるか。
	const hasInProgress = $derived(
		tentativeActual !== undefined && tentativeActual > actual,
	);
	const tentativePercent = $derived(
		tentativeActual !== undefined && required > 0
			? Math.round(Math.min(100, (tentativeActual / required) * 100))
			: pct,
	);
</script>

<div class="space-y-4">
	<div class="space-y-2">
		<h2 class="text-display text-[color:var(--color-fg)]">{title}</h2>
		{#if lead}
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
				{@render lead()}
			</div>
		{/if}
	</div>

	<div class="space-y-2">
		<Progress
			label={title}
			{actual}
			{required}
			{satisfied}
			{tentativeActual}
			{tentativeSatisfied}
			{unit}
			size="hero"
			showLabel={false}
		/>
		<div
			class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-body text-[color:var(--color-fg-muted)]"
		>
			<span class="tabular-nums">
				<span class="font-semibold text-[color:var(--color-fg)]">{actual}</span>
				<span class="text-[color:var(--color-fg-subtle)]"> / {required} {unit}</span>
				<span class="text-[color:var(--color-fg-subtle)]"> · {pct}%</span>
				{#if hasInProgress}
					<span class="font-medium text-[color:var(--color-accent-link)]">
						→ {tentativePercent}%
					</span>
				{/if}
			</span>
			{#if showHint && state === "in-progress"}
				<span
					class="font-medium tabular-nums text-[color:var(--color-accent-link)]"
				>
					履修中 {inProgressDelta} {unit} で充足予定
				</span>
			{:else if showHint && state === "unmet" && remaining > 0}
				<span
					class="font-medium tabular-nums text-[color:var(--color-warning-fg)]"
				>
					あと {remaining} {unit}
				</span>
			{/if}
		</div>
	</div>

	{#if meta}
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-small">
			{@render meta()}
		</div>
	{/if}
</div>
