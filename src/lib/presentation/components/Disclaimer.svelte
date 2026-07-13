<script lang="ts">
	import { base } from "$app/paths";
	import { disclaimerStore } from "$lib/presentation/stores/disclaimer.svelte";
	import Button from "$lib/presentation/ui/Button.svelte";

	let dialogEl = $state<HTMLDialogElement>();

	// Top-layer consent gate. showModal() lifts the dialog above everything (no
	// z-index bookkeeping), traps focus, and makes the rest of the page inert —
	// all natively, replacing the former hand-written focus trap + body scroll
	// lock. It's a gate, so Esc must NOT dismiss it: swallow the `cancel` event.
	// jsdom lacks showModal(), so fall back to `open` for render tests.
	//
	// Opened a double-rAF after mount so showModal()'s forced synchronous layout
	// lands on a settled tree, not inside the mount flush.
	$effect(() => {
		const el = dialogEl;
		if (el === undefined) return;
		const open = () => {
			try {
				el.showModal();
			} catch {
				el.open = true;
			}
		};
		let raf1 = 0;
		let raf2 = 0;
		if (typeof requestAnimationFrame === "function") {
			raf1 = requestAnimationFrame(() => {
				raf2 = requestAnimationFrame(open);
			});
		} else {
			open();
		}
		return () => {
			cancelAnimationFrame?.(raf1);
			cancelAnimationFrame?.(raf2);
			try {
				el.close();
			} catch {
				el.open = false;
			}
		};
	});
</script>

<!--
  ご利用にあたって（免責事項）同意モーダル。

  レイアウト方針:
    - モバイル（<640px）: フル viewport の "シート"。rounded/border なし。
      viewport 全体を使いきるので「縦にはみ出す」感を消す。notch/ホームバー
      対応で safe-area-inset を padding に乗せる。
    - デスクトップ（≥640px）: 中央配置の max-w-modal（560px）カード。

  高さは 100dvh (dynamic viewport height) を優先。iOS Safari で address bar
  が表示されているとき 100vh が実画面より大きくなる問題を回避する。
-->
<dialog
	bind:this={dialogEl}
	class="disclaimer-dialog"
	aria-labelledby="disclaimer-title"
	aria-describedby="disclaimer-body"
	oncancel={(e) => e.preventDefault()}
>
	<div
		class="disclaimer-overlay flex items-stretch justify-center bg-[color:var(--color-overlay-backdrop)] backdrop-blur-md motion-safe:animate-[fadeIn_0.2s_ease-out] sm:items-center sm:px-4 sm:py-6"
	>
		<div
			class="flex w-full flex-col bg-[color:var(--color-surface)] sm:max-h-modal sm:max-w-modal sm:rounded-[var(--radius-card)] sm:border sm:border-[color:var(--color-border)] sm:shadow-[var(--shadow-lifted)]"
		>
			<div
				class="flex-shrink-0 px-4 pb-2 pt-4 sm:p-8 sm:pb-4"
				style="padding-top: max(1rem, env(safe-area-inset-top));"
			>
				<h2 id="disclaimer-title" class="text-h2 text-[color:var(--color-fg)] sm:text-h1">
					ご利用にあたって
				</h2>
			</div>

			<div
				id="disclaimer-body"
				class="flex-1 space-y-3 overflow-y-auto px-4 text-small leading-relaxed text-[color:var(--color-fg-muted)] sm:px-8 sm:leading-relaxed"
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

			<div
				class="flex-shrink-0 border-t border-[color:var(--color-divider)] px-4 py-4 sm:border-t-0 sm:p-8 sm:pt-4"
				style="padding-bottom: max(1rem, env(safe-area-inset-bottom));"
			>
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
					class="mt-2 text-center text-caption text-[color:var(--color-fg-subtle)] sm:mt-3"
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
</dialog>
