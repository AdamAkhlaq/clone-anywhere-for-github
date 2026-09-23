import { chromium, expect, test as base } from "@playwright/test";
import type { BrowserContext } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Runs the built extension against the real github.com, so a GitHub redesign
// that stops the tab from rendering fails here instead of going unnoticed
// until a user reports it.
const EXTENSION_PATH = resolve(__dirname, "..", "dist");
const REPO_URL = "https://github.com/AdamAkhlaq/clone-anywhere-for-github";

const test = base.extend<{ context: BrowserContext }>({
	// Extensions only load into a persistent context, so replace Playwright's
	// default context with one that has the built extension installed.
	// Playwright requires the destructuring pattern to resolve fixtures.
	// eslint-disable-next-line no-empty-pattern
	context: async ({}, use) => {
		const userDataDir = mkdtempSync(join(tmpdir(), "clone-anywhere-e2e-"));
		const context = await chromium.launchPersistentContext(userDataDir, {
			channel: "chromium",
			args: [
				`--disable-extensions-except=${EXTENSION_PATH}`,
				`--load-extension=${EXTENSION_PATH}`,
			],
		});
		await use(context);
		await context.close();
		rmSync(userDataDir, { recursive: true, force: true });
	},
});

test.afterEach(async ({ page }, testInfo) => {
	await page.screenshot({
		path: testInfo.outputPath("code-dropdown.png"),
		fullPage: false,
	});
});

test("adds the clone tab to GitHub's Code dropdown", async ({ page }) => {
	await page.goto(REPO_URL);
	await page.getByRole("button", { name: "Code", exact: true }).click();

	const list = page.getByRole("list", { name: "Remote URL selector" });
	const tab = list.locator("#clone-target-tab");
	const tabButton = tab.getByRole("button");
	const panel = page.locator("#clone-target-panel");
	const httpsInput = page.locator("#clone-with-https");

	await expect(tab).toBeVisible();
	await expect(list.locator("li").first()).toHaveId("clone-target-tab");
	await expect(tabButton).toHaveAttribute("aria-pressed", "true");
	await expect(tab).toHaveAttribute("data-selected", "");
	await expect(
		panel.getByRole("button", { name: "Download .zip" })
	).toBeVisible();
	await expect(panel).toContainText(
		"Download the current branch as a .zip archive."
	);
	await expect(httpsInput).toBeHidden();

	// The injected tab must match the native ones pixel for pixel: same height,
	// and the selected knob styling GitHub applies through aria-pressed.
	const native = list.getByRole("button", { name: "Clone with HTTPS" });
	const [ours, theirs] = await Promise.all([
		tabButton.boundingBox(),
		native.boundingBox(),
	]);
	expect(ours?.height).toBe(theirs?.height);
	await expect(tabButton).toHaveCSS("font-weight", "600");
	await expect(native).toHaveCSS("font-weight", "400");

	await native.click();
	await expect(panel).toHaveCount(0);
	await expect(httpsInput).toBeVisible();
	await expect(tabButton).toHaveAttribute("aria-pressed", "false");
	await expect(native).toHaveAttribute("aria-pressed", "true");

	await tabButton.click();
	await expect(panel).toBeVisible();
	await expect(httpsInput).toBeHidden();
	await expect(native).toHaveAttribute("aria-pressed", "false");
});

test("survives closing and reopening the dropdown", async ({ page }) => {
	await page.goto(REPO_URL);
	const codeButton = page.getByRole("button", { name: "Code", exact: true });

	await codeButton.click();
	await expect(page.locator("#clone-target-tab")).toBeVisible();

	await page.keyboard.press("Escape");
	await expect(page.locator("#clone-target-tab")).toHaveCount(0);

	await codeButton.click();
	await expect(page.locator("#clone-target-tab")).toBeVisible();
	await expect(page.locator("#clone-target-tab")).toHaveCount(1);
	await expect(page.locator("#clone-target-panel")).toHaveCount(1);
});

test("keeps working after an in-page navigation to another repo", async ({
	page,
}) => {
	await page.goto(REPO_URL);
	await page
		.getByRole("link", { name: "AdamAkhlaq", exact: true })
		.first()
		.click();
	await page.waitForURL(/github\.com\/AdamAkhlaq\/?$/);

	// Navigate back to a repository through GitHub's own client-side router.
	await page.goBack();
	await page.waitForURL(REPO_URL);
	await page.getByRole("button", { name: "Code", exact: true }).click();

	await expect(page.locator("#clone-target-tab")).toBeVisible();
	await expect(page.locator("#clone-target-panel")).toBeVisible();
});
