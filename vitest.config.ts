import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		environment: "node",
		include: ["src/**/*.{test,spec}.{js,ts}"],
		exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
		// pdfjs-dist が内部で worker_threads を立ち上げるため、
		// Vitest の worker_threads プールと入れ子になると structuredClone の
		// ArrayBuffer transfer がハングしたりエラーになったりする。
		// fork プールに切り替えて回避する。
		pool: "forks",
		coverage: {
			provider: "istanbul",
			reporter: ["text", "html"],
			include: ["src/lib/**"],
			exclude: [
				"src/lib/**/*.{test,spec}.{js,ts}",
				"src/lib/**/index.ts",
				"src/lib/**/fixtures.ts",
				"src/lib/presentation/**",
				// Worker ファイルは実ブラウザでしか全経路走らないので除外
				// （ロジックは `auto-parser` / `pdf-parser` / `text-parser` などに
				//  集約してあるので、これらのテストで論理面はカバー済み）
				"src/lib/infrastructure/workers/transcript-worker.ts",
				"src/lib/infrastructure/workers/transcript-worker-client.ts",
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
					// 入力ソースが外部（PDF 座標・ブラウザコピペテキスト）なので、
					// noUncheckedIndexedAccess の defensive `?? ""` や、
					// 仕様外入力のガードで実際に到達しないブランチ・文が残る。
					// 100% を目指すと istanbul-ignore コメントだらけになるので
					// lines/functions は 100%、branches/statements は 90% 水準に緩める
					branches: 90,
					functions: 100,
					lines: 100,
					statements: 90,
				},
			},
		},
	},
});
