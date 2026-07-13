import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) =>
			filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
	},
	kit: {
		adapter: adapter({ fallback: "404.html", precompress: true }),
		paths: { base: process.env.BASE_PATH ?? "" },
		// Inline app CSS into each page <head> to drop the render-blocking
		// stylesheet round-trip. Threshold is in UTF-16 code units.
		inlineStyleThreshold: 50_000,
		prerender: {
			entries: ["*"],
		},
	},
};

export default config;
