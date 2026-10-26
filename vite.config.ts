import { paraglideVitePlugin } from "@inlang/paraglide-js";
import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

const INLINE_STYLE_THRESHOLD_UTF16 = 50_000;

function basePathFromEnvironment(value: string | undefined): "" | `/${string}` {
	if (value === undefined || value === "") {
		return "";
	}
	if (!value.startsWith("/") || value.endsWith("/")) {
		throw new Error("BASE_PATH must start with / and omit a trailing slash.");
	}
	return value as `/${string}`;
}

export default defineConfig({
	plugins: [
		// i18n: compile messages/*.json into #lib/paraglide at build time.
		// Single locale for now (ja); `baseLocale` strategy keeps it fetch-free and static.
		paraglideVitePlugin({
			project: "./project.inlang",
			outdir: "./src/lib/paraglide",
			strategy: ["baseLocale"],
		}),
		// Icons: build-time inline SVG from Iconify's `ic` (Material Icons Round) set.
		tailwindcss(),
		Icons({ compiler: "svelte" }),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
			},
			adapter: adapter({ fallback: "404.html", precompress: true }),
			paths: { base: basePathFromEnvironment(process.env["BASE_PATH"]) },
			// Inline app CSS into each page <head> to drop the render-blocking stylesheet round-trip.
			// Threshold is in UTF-16 code units.
			inlineStyleThreshold: INLINE_STYLE_THRESHOLD_UTF16,
			prerender: {
				entries: ["*"],
			},
		}),
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
