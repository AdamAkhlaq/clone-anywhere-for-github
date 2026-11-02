import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		// The content script only runs on github.com, so relative links in the
		// captured GitHub markup must resolve against it as they do in production.
		environmentOptions: { jsdom: { url: "https://github.com/" } },
		include: ["src/**/*.test.ts"],
	},
});
