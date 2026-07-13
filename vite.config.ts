import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

export default defineConfig({
	// Icons: build-time inline SVG from Iconify's `ic` (Material Icons Round) set.
	plugins: [tailwindcss(), Icons({ compiler: "svelte" }), sveltekit()],
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
