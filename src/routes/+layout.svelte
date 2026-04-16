<script lang="ts">
	import { GraduationCap } from "lucide-svelte";
	import ErrorBanner from "$lib/presentation/components/ErrorBanner.svelte";
	import "./layout.css";

	let { children } = $props();
</script>

<div class="min-h-screen bg-slate-50 text-slate-900 antialiased">
	<header class="border-b border-slate-200 bg-white">
		<div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
			<GraduationCap class="h-6 w-6 text-slate-900" aria-hidden="true" />
			<h1 class="text-lg font-bold">卒業要件判定ツール</h1>
			<p class="ml-2 text-xs text-slate-500">高知大学 v1</p>
		</div>
	</header>
	<main class="mx-auto max-w-5xl space-y-6 px-4 py-8">
		<ErrorBanner />
		{@render children()}
	</main>
	<footer class="mx-auto max-w-5xl px-4 pb-8 pt-4 text-xs text-slate-500">
		入力データはブラウザ内のみで処理されます。送信されません。
	</footer>
</div>
