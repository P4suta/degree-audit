import { expect, test } from "@playwright/test";

// The consent gate is a native <dialog>.showModal(): it must open modally, must
// NOT be dismissable by Esc (it's a gate), and acknowledging must close it.
test.describe("consent dialog", () => {
	const gate = (page: import("@playwright/test").Page) =>
		page.getByRole("dialog", { name: "ご利用にあたって" });

	test("opens as a modal on first visit", async ({ page }) => {
		await page.goto("/");
		await expect(gate(page)).toBeVisible();
	});

	test("Escape does not dismiss the gate", async ({ page }) => {
		await page.goto("/");
		await expect(gate(page)).toBeVisible();
		await page.keyboard.press("Escape");
		// Still open — the component swallows the dialog `cancel` event.
		await expect(gate(page)).toBeVisible();
	});

	test("acknowledging closes the gate", async ({ page }) => {
		await page.goto("/");
		await gate(page)
			.getByRole("button", { name: /利用する/ })
			.click();
		await expect(gate(page)).toBeHidden();
	});
});
