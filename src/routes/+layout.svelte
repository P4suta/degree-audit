<script lang="ts">
	import { base } from "$app/paths";
	import { GraduationCap, Trash2 } from "lucide-svelte";
	import ErrorBanner from "$lib/presentation/components/ErrorBanner.svelte";
	import WarningBanner from "$lib/presentation/components/WarningBanner.svelte";
	import { safeGoto } from "$lib/presentation/navigation";
	import { errorsStore } from "$lib/presentation/stores/errors.svelte";
	import { profileStore } from "$lib/presentation/stores/profile.svelte";
	import { transcriptStore } from "$lib/presentation/stores/transcript.svelte";
	import Button from "$lib/presentation/ui/Button.svelte";
	import { warningsStore } from "$lib/presentation/stores/warnings.svelte";
	import "./layout.css";

	let { children } = $props();

	const handleClearAll = () => {
		const confirmed =
			typeof window !== "undefined"
				? window.confirm(
						"このブラウザに保存されている学生プロフィールと成績データをすべて削除します。よろしいですか？",
					)
				: true;
		if (!confirmed) return;
		transcriptStore.clear();
		profileStore.clear();
		errorsStore.clear();
		warningsStore.clear();
		void safeGoto(`${base}/profile`);
	};
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
			このブラウザに学生プロフィールと成績データが保存されます。送信や外部通信は
			行われません。共用 PC・公共 PC ではご使用を避けるか、利用後に必ずデータを
			消去してください。
		</p>
		<Button variant="secondary" size="sm" onclick={handleClearAll}>
			<Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
			保存されている全データを消去
		</Button>
	</footer>
</div>
