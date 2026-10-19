import { defineConfig, devices } from "@playwright/test";

// E2E runs against the Vite dev server. The specs exercise the data-independent
// surface — the consent dialog, dark theme, and axe a11y on the static pages —
// so no built wasm / PDF fixture is required.
const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;
const CI_RETRIES = 2;
const SERVER_START_TIMEOUT_MS = 120_000;

export default defineConfig({
	testDir: "e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? CI_RETRIES : 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL: BASE_URL,
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "bun run dev",
		port: PORT,
		reuseExistingServer: !process.env.CI,
		timeout: SERVER_START_TIMEOUT_MS,
	},
});
