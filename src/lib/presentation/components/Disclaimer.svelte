<script lang="ts">
	import { base } from "$app/paths";
	import { disclaimerStore } from "$lib/presentation/stores/disclaimer.svelte";
	import Button from "$lib/presentation/ui/Button.svelte";
	import { onMount } from "svelte";

	let dialogEl: HTMLDivElement;

	// モーダル展開中は以下を制御する:
	//   - バックグラウンドのスクロール停止
	//   - Tab キーのフォーカストラップ（モーダル外へ抜けないようループさせる）
	//
	// フォーカストラップは bits-ui 等の外部依存を避けて最小構成で実装。
	// モーダル内の focusable 要素を毎回 querySelectorAll で取り直すことで、
	// 将来動的にボタンが増減しても追従する。
	onMount(() => {
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		const getFocusables = (): HTMLElement[] => {
			if (dialogEl === undefined) return [];
			return Array.from(
				dialogEl.querySelectorAll<HTMLElement>(
					'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
				),
			);
		};

		const handleKey = (e: KeyboardEvent): void => {
			if (e.key !== "Tab") return;
			const items = getFocusables();
			if (items.length === 0) return;
			const first = items[0];
			const last = items[items.length - 1];
			if (first === undefined || last === undefined) return;
			const active = document.activeElement;
			if (e.shiftKey && active === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && active === last) {
				e.preventDefault();
				first.focus();
			}
		};

		dialogEl.addEventListener("keydown", handleKey);

		return () => {
			dialogEl.removeEventListener("keydown", handleKey);
			document.body.style.overflow = prev;
		};
	});
</script>

<!--
  ご利用にあたって（免責事項）同意モーダル。
  アプリ全体の front で表示し、disclaimerStore.acknowledged が true になるまで
  コンテンツを触れない。tab キー・スクリーンリーダは aria-modal と aria-labelledby
  で誘導する。

  レイアウト構造:
    外側 wrapper (fixed inset-0)
      ├─ items-start sm:items-center: モバイルは上端固定（長文でも先頭から読める）
      └─ ダイアログ本体 (max-w-[560px] max-h-[calc(100dvh-48px)] flex-col)
           ├─ ヘッダー（固定）
           ├─ スクロール領域 (flex-1 overflow-y-auto)
           └─ フッター（固定）: 同意ボタン
  これによりモバイル横画面や小さな画面でも本文がスクロールでき、同意ボタンが
  常に見える状態を保つ。100dvh は Safari 16+ の dynamic viewport。未対応は
  100vh にフォールバックする。
-->
<div
	bind:this={dialogEl}
	class="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(0,0,0,0.45)] px-4 py-6 backdrop-blur-md motion-safe:animate-[fadeIn_0.2s_ease-out] sm:items-center"
	role="dialog"
	aria-modal="true"
	aria-labelledby="disclaimer-title"
	aria-describedby="disclaimer-body"
>
	<div
		class="disclaimer-modal flex w-full max-w-[560px] flex-col rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-lifted)]"
	>
		<div class="flex-shrink-0 p-5 pb-3 sm:p-8 sm:pb-4">
			<h2 id="disclaimer-title" class="text-h1 text-[color:var(--color-fg)]">
				ご利用にあたって
			</h2>
		</div>

		<div
			id="disclaimer-body"
			class="flex-1 space-y-3 overflow-y-auto px-5 text-small leading-[1.7] text-[color:var(--color-fg-muted)] sm:px-8"
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

		<div class="flex-shrink-0 p-5 sm:p-8">
			<Button
				variant="primary"
				size="lg"
				class="w-full rounded-[var(--radius-pill)]"
				autofocus
				onclick={() => disclaimerStore.acknowledge()}
			>
				上記を確認のうえ、利用する
			</Button>
			<p
				class="mt-3 text-center text-caption text-[color:var(--color-fg-subtle)]"
			>
				完全版は <a
					href={`${base}/disclaimer`}
					class="underline hover:text-[color:var(--color-accent-link)]"
					>免責事項ページ</a
				> で確認できます
			</p>
		</div>
	</div>
</div>

<style>
	.disclaimer-modal {
		/* 古いブラウザ fallback → モダン Safari 16+ では dvh を採用 */
		max-height: calc(100vh - 48px);
		max-height: calc(100dvh - 48px);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
