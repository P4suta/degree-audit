import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) =>
			filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
	},
	kit: {
		// precompress: 静的ホストが .br/.gz を配れるよう事前圧縮も出力する。
		adapter: adapter({ fallback: "404.html", precompress: true }),
		paths: { base: process.env.BASE_PATH ?? "" },
		// アプリ CSS（~41KB）を各ページの <head> にインライン化し、レンダー
		// ブロッキングな <link rel="stylesheet"> の往復を無くす（FCP/LCP 改善）。
		// しきい値は UTF-16 コードユニット長。
		inlineStyleThreshold: 50_000,
		prerender: {
			entries: ["*"],
		},
	},
};

export default config;
