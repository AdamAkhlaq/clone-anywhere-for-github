import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "e2e",
	timeout: 60_000,
	// The tests hit the live github.com, so a transient network hiccup in CI
	// gets one more attempt before it is reported as a real regression.
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: process.env.CI ? [["github"], ["list"]] : "list",
	use: {
		viewport: { width: 1400, height: 900 },
	},
});
