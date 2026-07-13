<script lang="ts">
	import { base } from "$app/paths";
	import type { SpecResult } from "$lib/domain/specifications/types";
	import Badge from "../ui/Badge.svelte";
	import { resolveProgressState } from "../ui/progress-layout.ts";
	import ChevronRight from "~icons/ic/round-chevron-right";

	interface Props {
		readonly id: string;
		readonly label: string;
		readonly result: SpecResult;
		readonly tentativeResult?: SpecResult | undefined;
		/** リスト内の最大 required。これを基準にバー長・目盛りを共通スケール化し、
		 *  「塗り＝取得単位・空き＝残り単位」を絶対量として目視で測れるようにする。 */
		readonly maxRequired: number;
	}

	const { id, label, result, tentativeResult, maxRequired }: Props = $props();

	const unit = $derived(result.unit ?? "単位");
	const remaining = $derived(Math.max(0, result.required - result.actual));
	const state = $derived(
		resolveProgressState({
			satisfied: result.satisfied,
			tentativeSatisfied: tentativeResult?.satisfied,
		}),
	);
	const inProgressDelta = $derived(
		tentativeResult === undefined
			? 0
			: Math.max(0, tentativeResult.actual - result.actual),
	);
	// 達成率（0〜100%）。超過は 100% で頭打ち。
	const percent = $derived(
		result.required > 0
			? Math.round(Math.min(100, (result.actual / result.required) * 100))
			: 0,
	);
	// 履修中込みの見込み達成率（履修中がすべて通った場合）。
	const tentativePercent = $derived(
		tentativeResult !== undefined && result.required > 0
			? Math.round(Math.min(100, (tentativeResult.actual / result.required) * 100))
			: percent,
	);

	// すべて共通スケール（0〜maxRequired 単位）で幅を出す。よって
	//   track 幅 = この要件の必要単位、fill 幅 = 取得単位、空き = 残り単位
	// が行をまたいで同じ物差しで読める。
	const base100 = $derived(maxRequired > 0 ? maxRequired : 1);
	const pct = (n: number) => (Math.max(0, n) / base100) * 100;
	const requiredPct = $derived(pct(result.required));
	const actualPct = $derived(pct(Math.min(result.actual, result.required)));
	const tentativePct = $derived(
		pct(
			Math.min(
				Math.max(result.actual, tentativeResult?.actual ?? result.actual),
				result.required,
			),
		),
	);
	const hasInProgress = $derived(tentativePct > actualPct + 0.01);
	// 10 単位ごとの目盛り。共通スケールなので全行で縦に揃う。
	const tickPct = $derived((10 / base100) * 100);
	const fillColor = $derived(
		result.satisfied
			? "bg-[color:var(--color-success-fg)]"
			: "bg-[color:var(--color-accent)]",
	);
	const ariaValueText = $derived(
		hasInProgress
			? `${result.actual} / ${result.required} ${unit}（履修中 ${inProgressDelta} ${unit}）`
			: `${result.actual} / ${result.required} ${unit}`,
	);
</script>

<!--
  レポート行: 罫線区切りのリストで並べる 1 行。行頭に状態ドット、要件名、
  右端に現在値と chevron。2 行目は共通スケールのメーター（目盛り + トラック +
  取得塗り）で、単位数の重みと取得/残りを目視で測れるようにする。
-->
<a
	href={`${base}/requirements/${encodeURIComponent(id)}`}
	class="group block px-4 py-3.5 motion-safe:transition-colors hover:bg-[color:var(--color-overlay-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-accent)] sm:px-5"
>
	<div class="flex items-center gap-3">
		{#if state === "satisfied"}
			<Badge variant="success" dot pill>充足</Badge>
		{:else if state === "in-progress"}
			<Badge variant="accent" dot pill>履修中</Badge>
		{:else}
			<Badge variant="warning" dot pill>不足</Badge>
		{/if}
		<span
			class="flex-1 min-w-0 truncate text-body-emph text-[color:var(--color-fg)]"
		>
			{label}
		</span>
		<span
			class="shrink-0 text-small tabular-nums text-[color:var(--color-fg-subtle)]"
		>
			<span class="font-semibold text-[color:var(--color-fg)]">{result.actual}</span>
			/ {result.required} {unit}
		</span>
		<ChevronRight
			class="h-5 w-5 shrink-0 text-[color:var(--color-fg-subtle)] motion-safe:transition-colors group-hover:text-[color:var(--color-fg-muted)]"
			aria-hidden="true"
		/>
	</div>

	<div class="mt-2.5 flex items-center gap-3">
		<div
			class="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-[var(--radius-pill)]"
			role="progressbar"
			aria-label={label}
			aria-valuenow={result.actual}
			aria-valuemin={0}
			aria-valuemax={result.required}
			aria-valuetext={ariaValueText}
		>
			<!-- トラック: 0〜必要単位（この要件の大きさ） -->
			<div
				class="absolute inset-y-0 left-0 bg-[color:var(--color-overlay-light)]"
				style={`width: ${requiredPct}%`}
				aria-hidden="true"
			></div>
			<!-- 履修中層: 取得〜履修中込みまで、accent の薄い斜線ストライプ -->
			{#if hasInProgress}
				<div
					class="absolute inset-y-0 left-0 motion-safe:transition-all"
					style={`width: ${tentativePct}%; background-image: repeating-linear-gradient(45deg, var(--color-accent-ring) 0, var(--color-accent-ring) 3px, transparent 3px, transparent 6px); background-color: color-mix(in srgb, var(--color-accent) 14%, transparent);`}
					aria-hidden="true"
				></div>
			{/if}
			<!-- 取得塗り: 0〜取得単位（絶対長＝取得単位） -->
			<div
				class="absolute inset-y-0 left-0 rounded-[var(--radius-pill)] {fillColor} motion-safe:transition-all"
				style={`width: ${actualPct}%`}
				aria-hidden="true"
			></div>
			<!-- 目盛り: 0〜必要単位を 10 単位ごとに薄く刻む物差し。最前面に置き、
			     取得塗り・残りトラックの両方を横断して長さを測れるようにする。 -->
			<div
				class="absolute inset-y-0 left-0"
				style={`width: ${requiredPct}%; background-image: repeating-linear-gradient(to right, var(--color-overlay-medium) 0, var(--color-overlay-medium) 1px, transparent 1px, transparent ${tickPct}%)`}
				aria-hidden="true"
			></div>
		</div>
		<div
			class="flex shrink-0 items-baseline gap-1.5 text-caption tabular-nums"
		>
			{#if hasInProgress}
				<!-- 現状% → 履修中込みの見込み% -->
				<span class="font-medium text-[color:var(--color-fg-subtle)]">{percent}%</span>
				<span class="font-medium text-[color:var(--color-accent-link)]">
					→ {tentativePercent}%
				</span>
			{:else if state === "unmet" && remaining > 0}
				<span class="font-medium text-[color:var(--color-warning-fg)]">
					あと {remaining} {unit}
				</span>
				<span class="font-medium text-[color:var(--color-fg-subtle)]">{percent}%</span>
			{:else}
				<span class="font-medium text-[color:var(--color-fg-subtle)]">{percent}%</span>
			{/if}
		</div>
	</div>
</a>
