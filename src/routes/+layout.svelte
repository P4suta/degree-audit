<script lang="ts">
	import { base } from "$app/paths";
	import { page } from "$app/state";
	import GraduationCap from "lucide-svelte/icons/graduation-cap";
	import Disclaimer from "$lib/presentation/components/Disclaimer.svelte";
	import ErrorBanner from "$lib/presentation/components/ErrorBanner.svelte";
	import WarningBanner from "$lib/presentation/components/WarningBanner.svelte";
	import { disclaimerStore } from "$lib/presentation/stores/disclaimer.svelte";
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
</script>

<!--
  免責事項の同意モーダル。disclaimerStore.acknowledged が true になるまで
  本体コンテンツへアクセスできない（fixed inset-0 + z-50 で被さる）。
  卒業に関わる判定を提供する性質上、毎セッション確認を取る設計。
  ただし /disclaimer ページ自体は免責文を読むための入口なので除外する。
-->
{#if showModal}
	<Disclaimer />
{/if}

<div class="min-h-screen antialiased" aria-hidden={showModal}>
	<!-- DESIGN.md: translucent glass header（ライト版）。
	     sticky + backdrop-filter で軽い浮遊感。罫線でコンテンツと区切る。
	     高さは iOS HIG の nav bar を踏まえて 56px。 -->
	<header
		class="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-[rgba(255,255,255,0.72)] backdrop-blur-xl backdrop-saturate-150"
	>
		<div class="container-page flex h-[56px] items-center gap-2">
			<GraduationCap
				class="h-5 w-5 text-[color:var(--color-accent)]"
				aria-hidden="true"
			/>
			<h1
				class="text-body-emph text-[color:var(--color-fg)] tracking-[-0.01em]"
			>
				卒業要件判定ツール
			</h1>
			<span
				class="ml-2 text-caption text-[color:var(--color-fg-subtle)] tabular-nums"
			>
				v1
			</span>
			<span
				class="ml-auto inline-flex items-center gap-1 rounded-[var(--radius-micro)] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] px-2 py-0.5 text-micro font-medium text-[color:var(--color-warning-fg)]"
				title="個人開発の非公式ツールです"
			>
				非公式
			</span>
		</div>
	</header>
	<main class="container-page space-y-6 py-8 sm:space-y-8 sm:py-12 lg:py-14">
		<ErrorBanner />
		<WarningBanner />
		{@render children()}
	</main>
	<footer
		class="container-page space-y-2 pt-6 text-small text-[color:var(--color-fg-subtle)]"
		style="padding-bottom: max(2rem, env(safe-area-inset-bottom));"
	>
		<p>
			<strong class="text-[color:var(--color-fg-muted)]"
				>本ツールは個人が作成した非公式のツールで、特定の大学・教育機関とは関係ありません。</strong
			>
			判定は参考情報にすぎず、卒業・履修の最終確認は必ず
			<strong class="text-[color:var(--color-fg-muted)]"
				>最新の履修案内・所属学部の教務担当・指導教員</strong
			>
			にご相談ください。詳細は
			<a
				href={`${base}/disclaimer`}
				class="text-[color:var(--color-accent-link)] underline hover:no-underline"
			>免責事項</a
			>
			をご覧ください。
		</p>
		<p>
			入力した学生プロフィールと成績データは、このタブ内のメモリにのみ保持されます。
			ブラウザには保存されず、外部への送信もありません。タブを閉じる・リロードする・
			別ページに遷移するとすべて消去されます。
		</p>
	</footer>
</div>
