<script lang="ts">
	import { base } from "$app/paths";
	import { safeGoto } from "$lib/presentation/navigation";
	import { disclaimerStore } from "$lib/presentation/stores/disclaimer.svelte";
	import Button from "$lib/presentation/ui/Button.svelte";
	import Card from "$lib/presentation/ui/Card.svelte";

	// このページから同意しても OK にする。モーダル経由と同じ扱い
	const handleAcknowledge = () => {
		disclaimerStore.acknowledge();
		void safeGoto(`${base}/`);
	};
</script>

<svelte:head>
	<title>免責事項 — 卒業要件判定ツール</title>
</svelte:head>

<a
	href={`${base}/dashboard`}
	class="text-sm text-[color:var(--color-accent-link)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background)]"
>
	&larr; Dashboard へ戻る
</a>

<header class="space-y-3">
	<h2 class="text-display text-[color:var(--color-fg)]">
		免責事項
	</h2>
	<p class="max-w-[640px] text-base text-[color:var(--color-fg-muted)]">
		本ツールを利用する前に、以下の事項を必ずご確認ください。
	</p>
</header>

<Card padding="lg">
	<div
		class="space-y-6 text-small leading-[1.75] text-[color:var(--color-fg)]"
	>
		<section class="space-y-2">
			<h3
				class="text-h3 text-[color:var(--color-fg)]"
			>
				1. 非公式性
			</h3>
			<p class="text-[color:var(--color-fg-muted)]">
				本ツール「卒業要件判定ツール」（以下「本ツール」）は、個人が作成・提供する非公式のものであり、特定の大学・教育機関とは一切の関係がなく、いかなる機関による承認、推奨、後援、その他の関与を受けたものではありません。
			</p>
		</section>

		<section class="space-y-2">
			<h3
				class="text-h3 text-[color:var(--color-fg)]"
			>
				2. 対応範囲
			</h3>
			<p class="text-[color:var(--color-fg-muted)]">
				本ツールが扱える判定範囲は現時点で
				<strong class="text-[color:var(--color-fg)]"
					>人文社会科学部 人文科学コース</strong
				>
				の令和 2 年度（2020 年度）以降の入学生に限られます（令和 2〜5
				年度、令和 6 年度以降の
				2 カリキュラム）。他学部・他コース・令和元年度以前の入学生については、本ツールでは正しい判定を行えません。
			</p>
			<p class="text-[color:var(--color-fg-muted)]">
				大学の規程は改定されることがあり、本ツール作成時点（2026
				年 4 月）の内容と最新の規程が異なる場合があります。
			</p>
		</section>

		<section class="space-y-2">
			<h3
				class="text-h3 text-[color:var(--color-fg)]"
			>
				3. 無保証（AS IS）
			</h3>
			<p class="text-[color:var(--color-fg-muted)]">
				本ツールは現状有姿（AS
				IS）で提供され、明示又は黙示を問わず、正確性、完全性、最新性、特定目的への適合性、商品性、権利非侵害その他一切の保証をいたしません。成績データの取り込み、科目区分の分類、要件の判定のいずれにおいても、バグ、仕様解釈の誤り、データの欠落等が生じる可能性があります。
			</p>
		</section>

		<section class="space-y-2">
			<h3
				class="text-h3 text-[color:var(--color-fg)]"
			>
				4. 責任制限
			</h3>
			<p class="text-[color:var(--color-fg-muted)]">
				本ツールの利用又は利用不能、判定結果への依拠その他により生じた直接的、間接的、付随的、結果的損害（履修登録の誤り、単位不足による留年・卒業延期、進路・就職上の不利益、逸失利益、その他の一切の損害を含みますが、これらに限りません）について、作成者は一切の責任を負いません。
			</p>
		</section>

		<section class="space-y-2">
			<h3
				class="text-h3 text-[color:var(--color-fg)]"
			>
				5. 最終判断は必ず公式情報で
			</h3>
			<div
				class="rounded-[var(--radius-md)] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] p-4 text-[color:var(--color-warning-fg)]"
			>
				<p>
					本ツールの判定結果は、履修計画を立てる際の
					<strong>参考情報</strong
					>にすぎません。卒業・履修に関わる最終的な判断は、必ず以下のいずれかによりご確認ください。
				</p>
				<ul class="mt-3 list-disc space-y-1 pl-5">
					<li>所属学部が発行する最新の<strong>履修案内</strong></li>
					<li>
						所属学部の<strong>教務担当</strong>（学生支援課、教務課等）
					</li>
					<li><strong>指導教員（チューター）</strong></li>
				</ul>
				<p class="mt-3">
					特に卒業論文履修資格については、年 2 回（3 月・9
					月）に開催される大学の<strong>卒業論文履修資格判定会議</strong
					>が公式な判定機関です。本ツールの出力結果に関わらず、公式の判定が優先します。
				</p>
			</div>
		</section>

		<section class="space-y-2">
			<h3
				class="text-h3 text-[color:var(--color-fg)]"
			>
				6. データの取り扱い
			</h3>
			<p class="text-[color:var(--color-fg-muted)]">
				本ツールに入力された学生プロフィール、成績データ、判定結果は、すべてご利用中のブラウザタブ内のメモリ上でのみ処理されます。サーバーへの送信、ブラウザへの永続保存（LocalStorage、Cookie、IndexedDB
				等）は一切行われず、タブを閉じる・リロードする・別ページへ移動するといった操作ですべての情報が失われます。
			</p>
			<p class="text-[color:var(--color-fg-muted)]">
				ただし、利用者ご自身が画面をスクリーンショットしたり、結果をコピー・共有したりする場合には、別途情報漏えいに注意を払う必要があります。
			</p>
		</section>

		<section class="space-y-2">
			<h3
				class="text-h3 text-[color:var(--color-fg)]"
			>
				7. 改訂
			</h3>
			<p class="text-[color:var(--color-fg-muted)]">
				本免責事項の内容は、予告なく変更されることがあります。本ツールの利用を継続されることで、変更後の条件に同意したものとみなします。
			</p>
		</section>
	</div>
</Card>

{#if !disclaimerStore.acknowledged}
	<!--
	  未同意で /disclaimer を開いた場合（モーダル内リンクから来た等）。
	  ここから直接同意して利用を開始できる導線を出す。
	  同意済みの場合は冗長なので出さない
	-->
	<div
		class="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-alt)] p-6 text-center"
	>
		<p class="text-sm text-[color:var(--color-fg-muted)]">
			上記の内容を確認のうえ、利用を開始できます。
		</p>
		<Button
			variant="primary"
			size="lg"
			class="rounded-[var(--radius-pill)] px-8"
			onclick={handleAcknowledge}
		>
			上記を確認のうえ、利用する
		</Button>
	</div>
{/if}
