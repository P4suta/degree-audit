<script lang="ts">
	import GraduationCap from "lucide-svelte/icons/graduation-cap";
	import ErrorBanner from "$lib/presentation/components/ErrorBanner.svelte";
	import WarningBanner from "$lib/presentation/components/WarningBanner.svelte";
	import "./layout.css";

	let { children } = $props();
</script>

<div class="min-h-screen antialiased">
	<header
		class="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]"
	>
		<div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
			<GraduationCap
				class="h-6 w-6 text-[color:var(--color-accent)]"
				aria-hidden="true"
			/>
			<h1 class="text-lg font-bold text-[color:var(--color-fg)]">
				卒業要件判定ツール
			</h1>
			<p class="ml-2 text-xs text-[color:var(--color-fg-subtle)]">
				高知大学 v1
			</p>
		</div>
	</header>
	<main class="mx-auto max-w-5xl space-y-6 px-4 py-8">
		<ErrorBanner />
		<WarningBanner />
		{@render children()}
	</main>
	<footer
		class="mx-auto max-w-5xl space-y-3 px-4 pb-8 pt-4 text-xs text-[color:var(--color-fg-muted)]"
	>
		<p>
			入力した学生プロフィールと成績データは、**このタブ内のメモリにのみ**
			保持されます。ブラウザに保存しない設計なので、タブを閉じる・リロードする・
			別ページに遷移するとすべて消去されます。外部への送信もありません。
		</p>
	</footer>
</div>
