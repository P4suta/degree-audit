<script lang="ts">
	import { base } from "$app/paths";
	import { disclaimerStore } from "$lib/presentation/stores/disclaimer.svelte";
	import Button from "$lib/presentation/ui/Button.svelte";
	import { onMount } from "svelte";

	// モーダル展開中はバックグラウンドのスクロールを止める。
	// 復帰時に元の overflow を戻す（別モーダルと競合しないように）
	onMount(() => {
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = prev;
		};
	});
</script>

<!--
  ご利用にあたって（免責事項）同意モーダル。
  アプリ全体の front で表示し、disclaimerStore.acknowledged が true になるまで
  コンテンツを触れない。tab キー・スクリーンリーダは aria-modal と aria-labelledby
  で誘導する。
-->
<div
	class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(0,0,0,0.45)] px-4 py-6 backdrop-blur-md motion-safe:animate-[fadeIn_0.2s_ease-out]"
	role="dialog"
	aria-modal="true"
	aria-labelledby="disclaimer-title"
	aria-describedby="disclaimer-body"
>
	<div
		class="w-full max-w-[560px] rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-lifted)] sm:p-8"
	>
		<h2
			id="disclaimer-title"
			class="text-h1 text-[color:var(--color-fg)]"
		>
			ご利用にあたって
		</h2>

		<div
			id="disclaimer-body"
			class="mt-5 space-y-3 text-small leading-[1.7] text-[color:var(--color-fg-muted)]"
		>
			<p>
				本ツールは個人が作成・提供する<strong
					class="text-[color:var(--color-fg)]">非公式</strong
				>のものであり、特定の大学・教育機関とは一切の関係がなく、いかなる機関による承認又は推奨を受けたものではありません。
			</p>

			<p>
				本ツールの対応範囲は現時点で<strong
					class="text-[color:var(--color-fg)]"
					>人文社会科学部 人文科学コース（令和 2 年度以降入学生）</strong
				>のみです。大学の規程は改定されることがあり、本ツール作成時点（2026
				年 4 月）の内容と最新の規程が異なる場合があります。
			</p>

			<p>
				本ツールは現状有姿（AS IS）で提供され、明示又は黙示を問わず、正確性・完全性・最新性・特定目的への適合性その他一切の保証をいたしません。成績の取り込み、区分分類、要件判定のいずれにも誤りが含まれる可能性があります。
			</p>

			<p>
				本ツールの利用又は利用不能により生じた直接的・間接的・付随的・結果的損害（履修登録の誤り、単位不足による留年・卒業延期その他の不利益を含みます）について、作成者は一切の責任を負いません。
			</p>

			<p
				class="rounded-[var(--radius-md)] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] p-3 text-[color:var(--color-warning-fg)]"
			>
				<strong>本ツールの判定結果は参考情報にすぎません。</strong>
				卒業・履修に関わる最終的な判断は、必ず<strong>最新の履修案内</strong>、<strong
					>所属学部の教務担当</strong
				>、<strong>指導教員（チューター）</strong
				>にご確認ください。特に卒業論文履修資格は、大学が年
				2 回（3 月・9 月）に開催する判定会議が公式の決定機関となります。
			</p>

			<p>
				入力された学生プロフィール・成績データは、すべてブラウザタブ内のメモリ上でのみ処理されます。サーバーへの送信、ブラウザへの永続保存（LocalStorage
				/
				Cookie 等）は一切行われず、タブを閉じる・リロードする・別ページへ移動するといった操作ですべて消去されます。
			</p>
		</div>

		<div class="mt-6 flex justify-center">
			<Button
				variant="primary"
				size="lg"
				class="rounded-[var(--radius-pill)] px-8"
				autofocus
				onclick={() => disclaimerStore.acknowledge()}
			>
				上記を確認のうえ、利用する
			</Button>
		</div>

		<p
			class="mt-3 text-center text-xs text-[color:var(--color-fg-subtle)]"
		>
			完全版は <a
				href={`${base}/disclaimer`}
				class="underline hover:text-[color:var(--color-accent-link)]"
				>免責事項ページ</a
			> で確認できます
		</p>
	</div>
</div>

<style>
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
