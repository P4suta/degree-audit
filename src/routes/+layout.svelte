<script lang="ts">
	import GraduationCap from "lucide-svelte/icons/graduation-cap";
	import ErrorBanner from "$lib/presentation/components/ErrorBanner.svelte";
	import WarningBanner from "$lib/presentation/components/WarningBanner.svelte";
	import "./layout.css";

	let { children } = $props();
</script>

<div class="min-h-screen antialiased">
	<!-- DESIGN.md: translucent glass header（ライト版）。
	     sticky + backdrop-filter で軽い浮遊感。罫線でコンテンツと区切る。 -->
	<header
		class="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-[rgba(255,255,255,0.72)] backdrop-blur-xl backdrop-saturate-150"
	>
		<div class="mx-auto flex max-w-[980px] items-center gap-2 px-5 h-[52px]">
			<GraduationCap
				class="h-5 w-5 text-[color:var(--color-accent)]"
				aria-hidden="true"
			/>
			<h1
				class="text-[15px] font-semibold text-[color:var(--color-fg)] tracking-[-0.01em]"
			>
				卒業要件判定ツール
			</h1>
			<span
				class="ml-2 text-xs text-[color:var(--color-fg-subtle)] tabular-nums"
			>
				高知大学 v1
			</span>
		</div>
	</header>
	<main class="mx-auto max-w-[980px] space-y-8 px-5 py-10 sm:py-14">
		<ErrorBanner />
		<WarningBanner />
		{@render children()}
	</main>
	<footer
		class="mx-auto max-w-[980px] space-y-2 px-5 pb-10 pt-6 text-xs text-[color:var(--color-fg-subtle)]"
	>
		<p>
			入力した学生プロフィールと成績データは、このタブ内のメモリにのみ保持されます。
			ブラウザには保存されず、外部への送信もありません。タブを閉じる・リロードする・
			別ページに遷移するとすべて消去されます。
		</p>
	</footer>
</div>
