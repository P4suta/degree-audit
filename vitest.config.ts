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
					// コピペ入力は外部由来で、noUncheckedIndexedAccess の
					// defensive `?? ""` や仕様外ガードで実際に到達しないブランチが
					// 残る。100% を目指すと istanbul-ignore まみれになるので
					// branches/statements は 90% 水準に緩め、lines/functions は 100%
					branches: 90,
					functions: 100,
					lines: 100,
					statements: 90,
				},
			},
		},
	},
});
