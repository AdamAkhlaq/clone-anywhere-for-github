import { chromium, expect, test as base } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { CLONE_TARGETS } from "../src/lib/clone-targets";

// Runs the built extension against the real github.com, so a GitHub redesign
// that stops the tab from rendering fails here instead of going unnoticed
// until a user reports it.
const EXTENSION_PATH = realpathSync(resolve(__dirname, "..", "dist"));
// The extension has no background worker to read its id from, but Chromium
// derives an unpacked extension's id from its path: the first 32 hex digits of
// the path's SHA-256, each mapped from 0-f onto a-p.
const EXTENSION_ID = [
	...createHash("sha256").update(EXTENSION_PATH).digest("hex").slice(0, 32),
]
	.map((digit) => String.fromCharCode(97 + parseInt(digit, 16)))
	.join("");
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
		panel.getByRole("button", { name: "Clone in VS Code" })
	).toBeVisible();
	await expect(panel).toContainText("Clone using VS Code.");
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

test("fits every target's tab on one line in the signed-in menu", async ({
	context,
	page,
}) => {
	await page.goto(REPO_URL);
	await page.getByRole("button", { name: "Code", exact: true }).click();

	const list = page.getByRole("list", { name: "Remote URL selector" });
	const tabButton = list.locator("#clone-target-tab").getByRole("button");
	const native = list.getByRole("button", { name: "Clone with HTTPS" });
	await expect(tabButton).toBeVisible();

	// Signed-in users also get an SSH item, which leaves the least room for our
	// label. This suite runs signed out, so recreate it from GitHub's own HTTPS
	// item.
	await native.evaluate((button) => {
		const https = button.closest("li")!;
		const ssh = https.cloneNode(true) as HTMLElement;
		const text = ssh.querySelector("[data-text]")!;
		text.textContent = "SSH";
		text.setAttribute("data-text", "SSH");
		ssh.querySelector("button")!.setAttribute("aria-label", "Clone with SSH");
		https.after(ssh);
	});

	const popup = await context.newPage();
	await popup.goto(`chrome-extension://${EXTENSION_ID}/popup.html`);

	for (const target of CLONE_TARGETS) {
		await popup.getByRole("radio", { name: target.label, exact: true }).click();
		await expect(tabButton).toHaveAttribute(
			"aria-label",
			target.kind === "archive"
				? "Download repository as a .zip"
				: `Clone with ${target.label}`
		);

		// The button keeps its fixed height when the label wraps (the text just
		// overflows it), so compare the label text itself with a native one.
		const [ours, theirs, control, container] = await Promise.all([
			tabButton.locator("[data-text]").boundingBox(),
			native.locator("[data-text]").boundingBox(),
			list.boundingBox(),
			list.locator("..").boundingBox(),
		]);
		expect(ours?.height, target.label).toBe(theirs?.height);
		expect(control!.x + control!.width, target.label).toBeLessThanOrEqual(
			container!.x + container!.width
		);
	}
});

async function chooseZipTarget(context: BrowserContext): Promise<void> {
	const popup = await context.newPage();
	await popup.goto(`chrome-extension://${EXTENSION_ID}/popup.html`);
	await popup.getByRole("radio", { name: ".zip", exact: true }).click();
	await popup.close();
}

// Clicks our download button and returns the path the archive was served from.
// GitHub redirects archives to codeload.github.com/<owner>/<repo>/zip/<ref>. A
// URL GitHub can't serve navigates the tab to a "404: Not Found" page instead
// of downloading, so a missing download fails fast rather than at the test
// timeout. `withoutNativeLink` removes GitHub's own "Download ZIP" link first,
// forcing the extension down its fallback path.
async function downloadZip(
	page: Page,
	{ withoutNativeLink = false } = {}
): Promise<string> {
	await page.getByRole("button", { name: "Code", exact: true }).click();
	if (withoutNativeLink) {
		await page.getByRole("link", { name: "Download ZIP" }).evaluate((link) => {
			link.remove();
		});
	}
	const [download] = await Promise.all([
		page.waitForEvent("download", { timeout: 10_000 }),
		page.getByRole("button", { name: "Download .zip" }).click(),
	]);
	await download.cancel();
	return new URL(download.url()).pathname;
}

// v1.2.0 is a published release, so its tag and commit are fixed forever.
const RELEASE_TAG = "v1.2.0";
const RELEASE_COMMIT = "02a52ae40c50a66d732ab0b823516b8f6318f65a";

for (const { view, path, ref } of [
	{ view: "branch", path: "", ref: "refs/heads/main" },
	{
		view: "tag",
		path: `/tree/${RELEASE_TAG}`,
		ref: `refs/tags/${RELEASE_TAG}`,
	},
	{ view: "commit", path: `/tree/${RELEASE_COMMIT}`, ref: RELEASE_COMMIT },
]) {
	test(`downloads the ${view} the page shows as a .zip`, async ({
		context,
		page,
	}) => {
		await chooseZipTarget(context);
		await page.goto(REPO_URL + path);

		expect(await downloadZip(page)).toBe(
			`${new URL(REPO_URL).pathname}/zip/${ref}`
		);
	});
}

test("keeps the .zip download inside the repo when user content mimics the branch switcher", async ({
	context,
	page,
}) => {
	await chooseZipTarget(context);
	await page.goto(REPO_URL);

	// This is GitHub's sanitized rendering of
	// `<a id="ref-selector" aria-label="../../../../../octocat/Hello-World/archive/refs/heads/master branch">`
	// in a README or comment (captured from GitHub's Markdown API): the id gains
	// a `user-content-` prefix and the aria-label survives. GitHub's own
	// switcher and "Download ZIP" link are removed so the planted link is the
	// only candidate the fallback path can find.
	await page.evaluate(() => {
		document.querySelector('[id$="ref-selector"]')?.remove();
		const planted = document.createElement("a");
		planted.id = "user-content-ref-selector";
		planted.setAttribute(
			"aria-label",
			"../../../../../octocat/Hello-World/archive/refs/heads/master branch"
		);
		planted.textContent = "docs";
		document.querySelector("article")?.prepend(planted);
	});

	expect(await downloadZip(page, { withoutNativeLink: true })).toMatch(
		new RegExp(`^${new URL(REPO_URL).pathname}/`)
	);
});
