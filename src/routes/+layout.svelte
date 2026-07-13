<script lang="ts">
	import { base } from "$app/paths";
	import { page } from "$app/state";
	import Disclaimer from "$lib/presentation/components/Disclaimer.svelte";
	import ErrorBanner from "$lib/presentation/components/ErrorBanner.svelte";
	import WarningBanner from "$lib/presentation/components/WarningBanner.svelte";
	import Badge from "$lib/presentation/ui/Badge.svelte";
	import { assessmentStore } from "$lib/presentation/stores/assessment.svelte";
	import { disclaimerStore } from "$lib/presentation/stores/disclaimer.svelte";
	import { Credit } from "$lib/domain/value-objects/credit";
	import GraduationCap from "~icons/ic/round-school";
	import "./layout.css";

	let { children } = $props();

	// 免責事項専用ページ (/disclaimer) は「同意する前に全文を読みに来る」
	// ための入口なので、モーダルで被せてしまうと読めなくなる。
	// このページだけはモーダルを出さずコンテンツを見せる（同意ボタンは
	// ページ内に別途設置している）
	const onDisclaimerPage = $derived(page.route.id === "/disclaimer");
	const showModal = $derived(
		!disclaimerStore.acknowledged && !onDisclaimerPage,
	);

	// ヘッダーに常駐する「成果物」表示。gyakubiki の plan pill に相当し、判定が
	// 済んでいれば chrome 側に verdict を出す。判定前は何も出さない。
	const assessment = $derived(assessmentStore.current);
	const verdict = $derived.by(() => {
		if (assessment === null) return null;
		if (assessment.graduatable)
			return { tone: "success", text: "要件充足" } as const;
		// 履修中（卒論など）込みで卒業可なら「充足予定」を出す。
		if (assessment.tentative?.graduatable)
			return { tone: "accent", text: "充足予定" } as const;
		const remaining = Math.max(
			0,
			assessment.totalCreditsRequired - Credit.toNumber(assessment.totalCredits),
		);
		return {
			tone: "warning",
			text: remaining > 0 ? `あと ${remaining} 単位` : "要件未充足",
		} as const;
	});
</script>

<!--
  免責事項の同意モーダル。disclaimerStore.acknowledged が true になるまで
  本体コンテンツへアクセスできない。卒業に関わる判定を提供する性質上、毎
  セッション確認を取る設計。ただし /disclaimer ページ自体は除外する。
-->
{#if showModal}
	<Disclaimer />
{/if}

<div class="min-h-screen antialiased" aria-hidden={showModal}>
	<!-- キーボード/スクリーンリーダー利用者向け: 最初のフォーカスで本文へ飛べる。
	     通常は視覚的に隠し (sr-only)、フォーカス時のみ表示する。 -->
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-nav focus:rounded-[var(--radius-control)] focus:border focus:border-[color:var(--color-border)] focus:bg-[color:var(--color-surface)] focus:px-4 focus:py-2 focus:text-body focus:text-[color:var(--color-accent-link)] focus:shadow-[var(--shadow-card)]"
	>
		本文へスキップ
	</a>
	<!-- ライトガラスの sticky ヘッダー。backdrop-filter で軽い浮遊感、hairline
	     でコンテンツと区切る。高さは iOS HIG の nav bar を踏まえて 56px。 -->
	<header
		class="sticky top-0 z-nav border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-glass)] backdrop-blur-xl backdrop-saturate-[1.8]"
	>
		<div class="container-page flex h-14 items-center gap-2">
			<GraduationCap
				class="h-5 w-5 shrink-0 text-[color:var(--color-accent)]"
				aria-hidden="true"
			/>
			<h1
				class="min-w-0 truncate text-body-emph text-[color:var(--color-fg)] tracking-[-0.01em]"
			>
				卒業要件判定ツール
			</h1>
			<span
				class="shrink-0 rounded-[var(--radius-chip)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-alt)] px-1.5 py-0.5 text-micro font-medium text-[color:var(--color-fg-subtle)]"
				title="個人開発の非公式ツールです"
			>
				非公式
			</span>
			<div class="ml-auto shrink-0 flex items-center pl-1" aria-live="polite">
				{#if verdict}
					<Badge variant={verdict.tone} pill dot>
						{verdict.text}
					</Badge>
				{/if}
			</div>
		</div>
	</header>
	<main
		id="main-content"
		class="container-page space-y-8 py-8 sm:space-y-10 sm:py-12 lg:py-14"
	>
		<ErrorBanner />
		<WarningBanner />
		{@render children()}
	</main>
	<footer
		class="container-page pt-8 text-caption text-[color:var(--color-fg-subtle)]"
		style="padding-bottom: max(2rem, env(safe-area-inset-bottom));"
	>
		<p>
			個人開発の非公式ツールです。判定は参考情報にすぎません。詳しくは
			<a
				href={`${base}/disclaimer`}
				class="text-[color:var(--color-accent-link)] underline hover:no-underline"
				>免責事項</a
			>。
		</p>
	</footer>
</div>
