import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Automated WCAG 2 A/AA audit of the static surface in both themes. We gate on
// serious/critical violations (contrast, roles, names, focus order) — the bar
// that matters — rather than every moderate nitpick.
const seriousViolations = async (page: import("@playwright/test").Page) => {
	const results = await new AxeBuilder({ page })
		.withTags(["wcag2a", "wcag2aa"])
		.analyze();
	return results.violations.filter(
		(v) => v.impact === "critical" || v.impact === "serious",
	);
};

const acknowledge = async (page: import("@playwright/test").Page) => {
	await page.goto("/");
	await page
		.getByRole("dialog")
		.getByRole("button", { name: /利用する/ })
		.click();
	await expect(page.getByRole("dialog")).toBeHidden();
};

for (const colorScheme of ["light", "dark"] as const) {
	test.describe(`a11y (${colorScheme})`, () => {
		test.use({ colorScheme });

		test("the consent gate has no serious axe violations", async ({ page }) => {
			await page.goto("/");
			await expect(page.getByRole("dialog")).toBeVisible();
			expect(await seriousViolations(page)).toEqual([]);
		});

		test("static pages have no serious axe violations", async ({ page }) => {
			await acknowledge(page);
			for (const path of ["/disclaimer", "/import"]) {
				await page.goto(path);
				expect(
					await seriousViolations(page),
					`${path} (${colorScheme})`,
				).toEqual([]);
			}
		});
	});
}
