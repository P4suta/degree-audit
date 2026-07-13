import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

/**
 * `server.warmup.clientFiles` は、dev サーバー起動時に指定ファイルを先に
 * トランスフォームして待機させる。これにより「初回アクセス時にようやく
 * いろいろ動き始めて長く待たされる」現象を緩和する。
 *
 * - `+layout.svelte` 共通レイアウト
 * - `/` 初回到達（PDF 有無で振り分けるリダイレクタ）
 * - `/import` 取り込み入口
 * - `/dashboard` 成果物ページ
 */
export default defineConfig({
	// アイコンは Iconify の `ic`（Material Icons Round）セットからビルド時に
	// インライン展開する（オフライン・tree-shake・ランタイム fetch ゼロ）:
	//   `import Foo from "~icons/ic/round-foo"`
	// fill ベースなので currentColor がそのまま効き、色トークンで着色できる。
	plugins: [tailwindcss(), Icons({ compiler: "svelte" }), sveltekit()],
	server: {
		warmup: {
			clientFiles: [
				"./src/routes/+layout.svelte",
				"./src/routes/+page.svelte",
				"./src/routes/import/+page.svelte",
				"./src/routes/dashboard/+page.svelte",
				"./src/lib/presentation/components/ErrorBanner.svelte",
				"./src/lib/presentation/components/WarningBanner.svelte",
				"./src/lib/presentation/components/TranscriptDropZone.svelte",
			],
		},
	},
	optimizeDeps: {
		// 最初の import で pre-bundle させておきたい依存（fast-check は test only）。
		include: ["zod"],
	},
});
