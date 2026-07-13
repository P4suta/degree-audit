import { defineConfig, devices } from "@playwright/test";

// E2E runs against the Vite dev server. The specs exercise the data-independent
// surface — the consent dialog, dark theme, and axe a11y on the static pages —
// so no built wasm / PDF fixture is required.
const PORT = 5173;

export default defineConfig({
	testDir: "e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "bun run dev",
		port: PORT,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
