import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

/**
 * `server.warmup.clientFiles` は、dev サーバー起動時に指定ファイルを先に
 * トランスフォームして待機させる。これにより「初回アクセス時にようやく
 * いろいろ動き始めて長く待たされる」現象を緩和する。
 *
 * - `+layout.svelte` 共通レイアウト
 * - `/profile` 初回到達ページ
 * - `/import` 遷移直後の次ページ
 * - `/dashboard` 成果物ページ
 */
export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		warmup: {
			clientFiles: [
				"./src/routes/+layout.svelte",
				"./src/routes/+page.svelte",
				"./src/routes/profile/+page.svelte",
				"./src/routes/import/+page.svelte",
				"./src/routes/dashboard/+page.svelte",
				"./src/lib/presentation/components/ErrorBanner.svelte",
				"./src/lib/presentation/components/WarningBanner.svelte",
				"./src/lib/presentation/components/TranscriptDropZone.svelte",
			],
		},
	},
	optimizeDeps: {
		// 最初の import で pre-bundle させておきたい依存（fast-check は test only）
		// lucide-svelte の barrel（7000+ アイコン）は重いので個別 path のみ列挙
		include: [
			"zod",
			"lucide-svelte/icons/graduation-cap",
			"lucide-svelte/icons/alert-triangle",
			"lucide-svelte/icons/circle-alert",
			"lucide-svelte/icons/circle-check",
			"lucide-svelte/icons/circle-x",
			"lucide-svelte/icons/file-up",
			"lucide-svelte/icons/info",
			"lucide-svelte/icons/x",
		],
	},
});
