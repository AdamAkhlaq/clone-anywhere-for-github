import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
	{ ignores: ["dist/", "node_modules/", "icons/", "coverage/"] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		// The content script runs in the browser/DOM; TypeScript handles
		// undeclared-identifier checking, so core no-undef is redundant here.
		files: ["src/**/*.ts"],
		languageOptions: {
			globals: { ...globals.browser },
		},
		rules: {
			"no-undef": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
		},
	},
	{
		files: ["store-assets/**/*.js"],
		languageOptions: { globals: { ...globals.browser } },
	},
	// Prettier owns formatting; disable any stylistic rules that would conflict.
	prettier,
];
