import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		environment: "node",
		include: ["src/**/*.{test,spec}.{js,ts}"],
		exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
		coverage: {
			provider: "istanbul",
			reporter: ["text", "html"],
			include: ["src/lib/**"],
			exclude: [
				"src/lib/**/*.{test,spec}.{js,ts}",
				"src/lib/**/index.ts",
				"src/lib/**/fixtures.ts",
				"src/lib/presentation/**",
			],
			thresholds: {
				"src/lib/domain/**": {
					branches: 100,
					functions: 100,
					lines: 100,
					statements: 100,
				},
				"src/lib/application/**": {
					branches: 100,
					functions: 100,
					lines: 100,
					statements: 100,
				},
				"src/lib/infrastructure/**": {
					branches: 100,
					functions: 100,
					lines: 100,
					statements: 100,
				},
			},
		},
	},
});
