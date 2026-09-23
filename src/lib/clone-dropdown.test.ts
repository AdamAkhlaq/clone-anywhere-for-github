import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	ELEMENT_IDS,
	findCloneMethodList,
	injectCloneTab,
	setActiveTarget,
} from "./clone-dropdown";

// The Code dropdown exactly as GitHub renders it today, so these tests
// exercise the same markup the content script meets in production.
const FIXTURE = readFileSync(
	join(__dirname, "fixtures", "code-dropdown.html"),
	"utf8"
);

const REPO = { owner: "octocat", repo: "hello-world", isRepository: true };

function list(): HTMLElement {
	const found = findCloneMethodList();
	if (!found) throw new Error("clone method list not found in fixture");
	return found;
}

const tab = () => document.getElementById(ELEMENT_IDS.cloneTab);
const panel = () => document.getElementById(ELEMENT_IDS.clonePanel);
const httpsInput = () => document.getElementById("clone-with-https")!;
const nativeButton = (label: string) =>
	document.querySelector<HTMLButtonElement>(
		`[aria-label="Remote URL selector"] button[aria-label="${label}"]`
	)!;

beforeEach(() => {
	document.body.innerHTML = FIXTURE;
	setActiveTarget("vscode");
});

describe("findCloneMethodList", () => {
	it("finds GitHub's segmented control by its accessible name", () => {
		expect(list().getAttribute("data-component")).toBe("SegmentedControl");
	});

	it("accepts a wrapper that carries the label instead of the list", () => {
		const control = list();
		const wrapper = document.createElement("nav");
		wrapper.setAttribute("aria-label", "Remote URL selector");
		control.removeAttribute("aria-label");
		control.replaceWith(wrapper);
		wrapper.appendChild(control);

		expect(findCloneMethodList()).toBe(control);
	});

	it("falls back to any list with an HTTPS item when the label changes", () => {
		const control = list();
		control.setAttribute("aria-label", "Something new");

		expect(findCloneMethodList()).toBe(control);
	});

	it("returns null when the dropdown is not rendered", () => {
		document.body.innerHTML = "";
		expect(findCloneMethodList()).toBeNull();
	});
});

describe("injectCloneTab", () => {
	it("prepends a selected tab cloned from GitHub's native item", () => {
		expect(injectCloneTab(list(), REPO)).toBe(true);

		const injected = tab()!;
		const native = list().children[1];
		expect(list().firstElementChild).toBe(injected);
		expect(injected.className).toBe(native.className);
		expect(injected.getAttribute("data-component")).toBe(
			native.getAttribute("data-component")
		);
		expect(injected.hasAttribute("data-selected")).toBe(true);
		expect(native.hasAttribute("data-selected")).toBe(false);

		const button = injected.querySelector("button")!;
		expect(button.className).toBe(native.querySelector("button")!.className);
		expect(button.getAttribute("aria-pressed")).toBe("true");
		expect(button.getAttribute("aria-label")).toBe("Clone with VS Code");
		expect(nativeButton("Clone with HTTPS").getAttribute("aria-pressed")).toBe(
			"false"
		);

		const text = injected.querySelector("[data-text]")!;
		expect(text.textContent).toBe("VS Code");
		expect(text.getAttribute("data-text")).toBe("VS Code");
	});

	it("shows a green clone button in place of GitHub's clone URL box", () => {
		injectCloneTab(list(), REPO);

		const injected = panel()!;
		expect(list().nextElementSibling).toBe(injected);
		// GitHub's `d-flex` is `!important`, so the hide must be too.
		const container = httpsInput().closest("div")!;
		expect(container.style.display).toBe("none");
		expect(container.style.getPropertyPriority("display")).toBe("important");
		expect(
			document.querySelector("p.fgColor-muted:not(#clone-target-panel p)")
		).toHaveProperty("style.display", "none");

		const button = injected.querySelector("button")!;
		expect(button.className).toBe("prc-Button-ButtonBase-9n-Xk");
		expect(button.getAttribute("data-variant")).toBe("primary");
		expect(button.textContent).toBe("Clone in VS Code");
		expect(injected.querySelector("p")!.textContent).toBe(
			"Clone using VS Code."
		);
		expect(injected.querySelector("p")!.className).toBe(
			"mt-2 fgColor-muted text-normal"
		);
	});

	it("hides clone-URL markup that GitHub renders after the panel is shown", async () => {
		const control = list();
		const container = httpsInput().closest("div")!;
		container.remove();
		injectCloneTab(control, REPO);

		control.parentElement!.insertBefore(
			container,
			control.parentElement!.querySelector(":scope > p")
		);
		await Promise.resolve();

		expect(container.style.display).toBe("none");
		expect(list().nextElementSibling).toBe(panel());

		nativeButton("Clone with HTTPS").click();
		expect(container.style.display).toBe("");
	});

	it("is a no-op when the tab is already injected", () => {
		injectCloneTab(list(), REPO);
		expect(injectCloneTab(list(), REPO)).toBe(false);
		expect(document.querySelectorAll(`#${ELEMENT_IDS.cloneTab}`)).toHaveLength(
			1
		);
	});

	it("hands back to GitHub's panel when a native tab is clicked", () => {
		injectCloneTab(list(), REPO);
		nativeButton("Clone with GitHub CLI").click();

		expect(panel()).toBeNull();
		expect(httpsInput().closest("div")!.style.display).toBe("");
		expect(tab()!.hasAttribute("data-selected")).toBe(false);
		expect(tab()!.querySelector("button")!.getAttribute("aria-pressed")).toBe(
			"false"
		);
		const cli = nativeButton("Clone with GitHub CLI");
		expect(cli.getAttribute("aria-pressed")).toBe("true");
		expect(cli.closest("li")!.hasAttribute("data-selected")).toBe(true);
		expect(nativeButton("Clone with HTTPS").getAttribute("aria-pressed")).toBe(
			"false"
		);
	});

	it("restores the panel when the injected tab is clicked again", () => {
		injectCloneTab(list(), REPO);
		nativeButton("Clone with HTTPS").click();
		tab()!.querySelector("button")!.click();

		expect(panel()).not.toBeNull();
		expect(httpsInput().closest("div")!.style.display).toBe("none");
		expect(tab()!.hasAttribute("data-selected")).toBe(true);
		expect(nativeButton("Clone with HTTPS").getAttribute("aria-pressed")).toBe(
			"false"
		);
	});

	it("builds a tab from fallback markup when the list is empty", () => {
		const control = list();
		control.innerHTML = "";

		injectCloneTab(control, REPO);

		const injected = tab()!;
		expect(injected.querySelector("button")!.getAttribute("aria-pressed")).toBe(
			"true"
		);
		expect(injected.querySelector("[data-text]")!.textContent).toBe("VS Code");
	});
});

describe("setActiveTarget", () => {
	it("relabels the injected tab, button, and description in place", () => {
		injectCloneTab(list(), REPO);
		setActiveTarget("zip");

		const text = tab()!.querySelector("[data-text]")!;
		expect(text.textContent).toBe(".zip");
		expect(text.getAttribute("data-text")).toBe(".zip");
		expect(tab()!.querySelector("button")!.getAttribute("aria-label")).toBe(
			"Download repository as a .zip"
		);
		expect(panel()!.querySelector("button")!.textContent).toBe("Download .zip");
		expect(panel()!.querySelector("p")!.textContent).toBe(
			"Download the current branch as a .zip archive."
		);
	});

	it("labels a later injection with the new target", () => {
		setActiveTarget("cursor");
		injectCloneTab(list(), REPO);

		expect(tab()!.textContent).toBe("Cursor");
		expect(panel()!.querySelector("button")!.textContent).toBe(
			"Clone in Cursor"
		);
	});
});
