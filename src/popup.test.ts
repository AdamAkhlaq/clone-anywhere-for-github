import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLONE_TARGETS } from "./lib/clone-targets";

// Minimal storage shim shared with the assertions, so a click's persisted value
// can be read back. Mirrors the chrome.storage.sync surface popup.ts uses.
function installChromeShim(): { read: () => unknown } {
	const store: Record<string, unknown> = {};
	const chromeShim = {
		storage: {
			sync: {
				get: async (key: string) => ({ [key]: store[key] }),
				set: async (items: Record<string, unknown>) => {
					Object.assign(store, items);
				},
			},
			onChanged: { addListener: () => {} },
		},
	};
	(globalThis as unknown as { chrome: unknown }).chrome = chromeShim;
	return { read: () => store["cloneTargetId"] };
}

// jsdom doesn't implement matchMedia; popup.ts reads it at import time.
function installMatchMedia(): void {
	window.matchMedia = (() => ({
		matches: false,
		addEventListener: () => {},
		removeEventListener: () => {},
	})) as unknown as typeof window.matchMedia;
}

function renderPopupShell(): void {
	document.body.innerHTML = `
		<span id="clone-target-tile"></span>
		<div id="clone-target" role="radiogroup" aria-labelledby="clone-target-label"></div>
	`;
}

// Let popup.ts's async init() (which awaits the stored choice) settle.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("popup target picker", () => {
	let storage: { read: () => unknown };

	beforeEach(() => {
		vi.resetModules();
		renderPopupShell();
		installMatchMedia();
		storage = installChromeShim();
	});

	afterEach(() => {
		delete (globalThis as unknown as { chrome?: unknown }).chrome;
	});

	it("renders one icon-bearing, selectable row per target", async () => {
		await import("./popup");
		await flush();

		const options = document.querySelectorAll('[role="radio"]');
		expect(options.length).toBe(CLONE_TARGETS.length);
		options.forEach((option) => {
			expect(option.querySelector("svg path")).not.toBeNull();
		});
	});

	it("checks the default target and mirrors it in the header tile", async () => {
		await import("./popup");
		await flush();

		const checked = document.querySelectorAll(
			'[role="radio"][aria-checked="true"]'
		);
		expect(checked.length).toBe(1);
		expect((checked[0] as HTMLElement).dataset.id).toBe("vscode");
		expect(
			document.getElementById("clone-target-tile")?.querySelector("svg")
		).not.toBeNull();
	});

	it("selects and persists the chosen editor on click", async () => {
		await import("./popup");
		await flush();

		const cursor = document.getElementById(
			"clone-target-option-cursor"
		) as HTMLElement;
		cursor.click();
		await flush();

		expect(cursor.getAttribute("aria-checked")).toBe("true");
		expect(storage.read()).toBe("cursor");
	});

	it("offers the .zip target as a selectable, persistable row", async () => {
		await import("./popup");
		await flush();

		const zip = document.getElementById(
			"clone-target-option-zip"
		) as HTMLElement;
		expect(zip).not.toBeNull();
		// The archive row carries the folder glyph like any other target's icon.
		expect(zip.querySelector("svg path")).not.toBeNull();

		zip.click();
		await flush();

		expect(zip.getAttribute("aria-checked")).toBe("true");
		expect(storage.read()).toBe("zip");
	});
});
