import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		// i18n: compile messages/*.json into $lib/paraglide at build time. Single
		// locale for now (ja); `baseLocale` strategy keeps it fetch-free and static.
		paraglideVitePlugin({
			project: "./project.inlang",
			outdir: "./src/lib/paraglide",
			strategy: ["baseLocale"],
		}),
		// Icons: build-time inline SVG from Iconify's `ic` (Material Icons Round) set.
		tailwindcss(),
		Icons({ compiler: "svelte" }),
		sveltekit(),
	],
	server: {
		// Pre-transform the hot entry points so the first request is not blocked.
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
		include: ["zod"],
	},
});
