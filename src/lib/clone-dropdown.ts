import { RepositoryInfo } from "./repository";
import { buildArchiveUrl, buildCloneUrl } from "./clone-url";
import { detectBranch } from "./branch";
import {
	CloneTarget,
	DEFAULT_TARGET_ID,
	getCloneTarget,
} from "./clone-targets";

export const ELEMENT_IDS = {
	cloneTab: "clone-target-tab",
	clonePanel: "clone-target-panel",
} as const;

// Marks GitHub's own clone-panel nodes we hid behind our panel so they can be
// restored (rather than recreated) when a native tab is selected again.
const HIDDEN_ATTRIBUTE = "data-clone-hidden";

// GitHub labels its HTTPS / SSH / GitHub CLI switcher with this accessible
// name. It is the most stable anchor in the dropdown: it survived the move
// from an UnderlineNav to a SegmentedControl, while every class name and the
// element type around it changed.
const REMOTE_URL_SELECTOR_LABEL = "Remote URL selector";

// Backstop only. Primer regenerates these hashes on every rebuild, so at
// runtime we clone GitHub's live markup instead (see createTab and
// resolveButtonClasses). These values are just the last-known-good fallback
// if that lookup ever fails.
const FALLBACK_CLASSES = {
	tab: {
		item: "prc-SegmentedControl-Item-tSCQh",
		button: "prc-SegmentedControl-Button-E48xz",
		content: "prc-SegmentedControl-Content-1COlk segmentedControl-content",
		text: "prc-SegmentedControl-Text-7S2y2 segmentedControl-text",
	},
	button: {
		base: "prc-Button-ButtonBase-9n-Xk",
		content: "prc-Button-ButtonContent-Iohp5",
		label: "prc-Button-Label-FWkx3",
	},
	description: "mt-2 fgColor-muted text-normal",
};

// The destination the user has chosen to clone to. Starts as the default
// target and is replaced by setActiveTarget once the persisted choice loads
// (and whenever it changes in the popup). Read live wherever a label or URL is
// built so the injected UI always reflects the active choice.
let activeTarget: CloneTarget = getCloneTarget(DEFAULT_TARGET_ID);

export function setActiveTarget(id: string): void {
	activeTarget = getCloneTarget(id);
	relabelInjectedUI();
}

// All wording shown in the injected UI, derived from a target in one place so
// the tab, its aria-label, the button, and the description stay in sync. The
// archive target gets download wording instead of the editors' clone wording,
// since it produces a file rather than opening an editor.
function cloneLabels(target: CloneTarget) {
	const tab = target.label;

	if (target.kind === "archive") {
		return {
			tab,
			aria: "Download repository as a .zip",
			button: "Download .zip",
			description: "Download the current branch as a .zip archive.",
		};
	}

	return {
		tab,
		aria: `Clone with ${target.label}`,
		button: `Clone in ${target.label}`,
		description: `Clone using ${target.label}.`,
	};
}

function createElement<K extends keyof HTMLElementTagNameMap>(
	tagName: K,
	attributes: Record<string, string> = {},
	styles: Record<string, string> = {}
): HTMLElementTagNameMap[K] {
	const element = document.createElement(tagName);

	for (const [key, value] of Object.entries(attributes)) {
		if (key === "className") {
			element.className = value;
		} else if (key === "textContent") {
			element.textContent = value;
		} else {
			element.setAttribute(key, value);
		}
	}

	if (Object.keys(styles).length > 0) {
		element.style.cssText =
			Object.entries(styles)
				.map(([key, value]) => `${key}: ${value} !important`)
				.join("; ") + ";";
	}

	return element;
}

/**
 * Locates the list of clone-method tabs (HTTPS / SSH / GitHub CLI) inside
 * `root`. Prefers the element GitHub labels "Remote URL selector", accepting
 * either the list itself or a wrapper around it, and falls back to any list
 * with an "HTTPS" item so a renamed label alone can't break the extension.
 */
export function findCloneMethodList(
	root: ParentNode = document
): HTMLElement | null {
	const labelled = root.querySelector<HTMLElement>(
		`[aria-label="${REMOTE_URL_SELECTOR_LABEL}"]`
	);
	if (labelled) {
		if (labelled.matches("ul, ol")) return labelled;
		const nested = labelled.querySelector<HTMLElement>("ul, ol");
		if (nested) return nested;
	}

	for (const list of Array.from(root.querySelectorAll<HTMLElement>("ul, ol"))) {
		const hasHttpsItem = Array.from(list.children).some(
			(item) => item.textContent?.trim() === "HTTPS"
		);
		if (hasHttpsItem) return list;
	}

	return null;
}

/**
 * Adds the clone-target tab as the first, selected item of `list` and shows
 * its panel in place of GitHub's clone-URL box. Idempotent: returns false
 * without touching the DOM when the tab is already present.
 */
export function injectCloneTab(
	list: HTMLElement,
	repoInfo: RepositoryInfo
): boolean {
	if (list.querySelector(`#${ELEMENT_IDS.cloneTab}`)) return false;

	const tab = createTab(list);
	list.prepend(tab);

	tab.querySelector("button")?.addEventListener("click", (event) => {
		event.preventDefault();
		selectItem(list, tab);
		showPanel(list, repoInfo);
	});

	// Primer only re-renders a native item when its React state changes, so a
	// native tab that React already considers selected (HTTPS, after we took
	// over from it) wouldn't repaint on click. Mirror the selection ourselves so
	// the segmented control always shows exactly one pressed item.
	list.addEventListener("click", (event) => {
		const item = (event.target as Element).closest("li");
		if (!item || item === tab || item.parentElement !== list) return;
		selectItem(list, item);
		restorePanel(list);
	});

	selectItem(list, tab);
	showPanel(list, repoInfo);
	return true;
}

/**
 * Repoints an already-injected tab/panel at the current target after the
 * stored choice loads or later changes in the popup, so the selection is
 * reflected on a page whose clone dropdown is already open. A no-op when
 * nothing is injected yet: fresh injections read the active target directly.
 */
export function relabelInjectedUI(): void {
	const labels = cloneLabels(activeTarget);

	const tab = document.getElementById(ELEMENT_IDS.cloneTab);
	if (tab) {
		const text = findTabText(tab);
		if (text) setTabText(text, labels.tab);
		tab.querySelector("button")?.setAttribute("aria-label", labels.aria);
	}

	const panel = document.getElementById(ELEMENT_IDS.clonePanel);
	if (panel) {
		const buttonLabel = panel.querySelector('button [data-component="text"]');
		if (buttonLabel) buttonLabel.textContent = labels.button;
		const description = panel.querySelector("p");
		if (description) description.textContent = labels.description;
	}
}

/**
 * Builds our tab by deep-cloning GitHub's first native item, so it carries
 * whatever classes and structure Primer currently renders instead of a
 * hardcoded copy that goes stale on the next rebuild. Only the identity,
 * label, and selection state are rewritten. Falls back to last-known markup
 * when the list is empty or the clone has no button to wire up.
 */
function createTab(list: HTMLElement): HTMLLIElement {
	const template = list.querySelector<HTMLLIElement>(":scope > li");
	const clone = template?.cloneNode(true) as HTMLLIElement | undefined;
	const tab = clone?.querySelector("button") ? clone : createFallbackTab();
	const labels = cloneLabels(activeTarget);

	tab.id = ELEMENT_IDS.cloneTab;
	tab.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
	tab.querySelectorAll("svg").forEach((el) => el.remove());

	const button = tab.querySelector("button") as HTMLButtonElement;
	button.type = "button";
	button.removeAttribute("aria-labelledby");
	button.removeAttribute("style");
	button.setAttribute("aria-label", labels.aria);

	const text = findTabText(tab) ?? button;
	setTabText(text, labels.tab);

	return tab;
}

function createFallbackTab(): HTMLLIElement {
	const item = createElement("li", {
		className: FALLBACK_CLASSES.tab.item,
		"data-component": "SegmentedControl.Button",
	});
	const button = createElement("button", {
		className: FALLBACK_CLASSES.tab.button,
		type: "button",
	});
	const content = createElement("span", {
		className: FALLBACK_CLASSES.tab.content,
	});
	const text = createElement("div", {
		className: FALLBACK_CLASSES.tab.text,
		"data-text": "",
	});

	content.appendChild(text);
	button.appendChild(content);
	item.appendChild(button);
	return item;
}

function findTabText(tab: Element): HTMLElement | null {
	return tab.querySelector<HTMLElement>('[data-text], [data-component="text"]');
}

// Primer's SegmentedControl reserves the bold width of every label through a
// hidden `::after` that reads `data-text`, so the label must be kept in both
// places or the tab would shift width when it becomes selected.
function setTabText(text: HTMLElement, label: string): void {
	text.textContent = label;
	if (text.hasAttribute("data-text")) text.setAttribute("data-text", label);
}

// Primer's SegmentedControl derives everything visual (the selected knob, the
// bold label, the separators) from `data-selected` on the item and
// `aria-pressed` on its button, so those two attributes are the whole
// selection state.
function selectItem(list: HTMLElement, selected: Element): void {
	for (const item of Array.from(list.children)) {
		const isSelected = item === selected;
		item.toggleAttribute("data-selected", isSelected);
		item
			.querySelector("button")
			?.setAttribute("aria-pressed", String(isSelected));
	}
}

// Keeps GitHub's clone-URL box hidden while our panel is shown. GitHub renders
// that box in a later React commit than the tab list (and re-renders it when
// a native tab's state changes), so a one-time hide at injection would miss
// nodes that arrive afterwards.
let nativePanelObserver: MutationObserver | null = null;

/**
 * Replaces GitHub's clone-URL box (every element after the tab list) with our
 * panel. The native nodes are hidden with `display: none` and tagged rather
 * than removed, so their event listeners and node identity survive until a
 * native tab is selected again.
 */
function showPanel(list: HTMLElement, repoInfo: RepositoryInfo): void {
	const parent = list.parentElement;
	if (!parent || parent.querySelector(`#${ELEMENT_IDS.clonePanel}`)) return;

	list.after(createPanel(parent, repoInfo));
	hideNativePanel(list);

	nativePanelObserver?.disconnect();
	nativePanelObserver = new MutationObserver(() => hideNativePanel(list));
	nativePanelObserver.observe(parent, { childList: true });
}

function hideNativePanel(list: HTMLElement): void {
	let sibling = list.nextElementSibling;
	while (sibling) {
		if (sibling.id !== ELEMENT_IDS.clonePanel) {
			// Primer utilities such as `d-flex` are `!important`, so a plain
			// inline display would lose to them.
			(sibling as HTMLElement).style.setProperty(
				"display",
				"none",
				"important"
			);
			sibling.setAttribute(HIDDEN_ATTRIBUTE, "true");
		}
		sibling = sibling.nextElementSibling;
	}
}

function restorePanel(list: HTMLElement): void {
	nativePanelObserver?.disconnect();
	nativePanelObserver = null;

	const parent = list.parentElement;
	if (!parent) return;

	parent.querySelector(`#${ELEMENT_IDS.clonePanel}`)?.remove();
	parent
		.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTRIBUTE}]`)
		.forEach((el) => {
			el.style.removeProperty("display");
			el.removeAttribute(HIDDEN_ATTRIBUTE);
		});
}

// Mirrors GitHub's own layout below the tab list: a `d-flex mb-2` row (their
// URL input) followed by a muted description paragraph, so our button sits at
// exactly the same offsets and the description matches theirs.
function createPanel(
	container: Element,
	repoInfo: RepositoryInfo
): HTMLDivElement {
	const labels = cloneLabels(activeTarget);
	const panel = createElement("div", { id: ELEMENT_IDS.clonePanel });

	const row = createElement("div", { className: "d-flex mb-2" });
	row.appendChild(createCloneButton(repoInfo));

	const nativeDescription = container.querySelector(":scope > p");
	const description = createElement("p", {
		className: nativeDescription?.className || FALLBACK_CLASSES.description,
		textContent: labels.description,
	});

	panel.appendChild(row);
	panel.appendChild(description);
	return panel;
}

function createCloneButton(repoInfo: RepositoryInfo): HTMLButtonElement {
	const classes = resolveButtonClasses();

	const button = createElement(
		"button",
		{
			"data-component": "Button",
			type: "button",
			className: classes.base,
			"data-loading": "false",
			"data-size": "medium",
			"data-variant": "primary",
		},
		{ width: "100%" }
	);
	const content = createElement("span", {
		"data-component": "buttonContent",
		"data-align": "center",
		className: classes.content,
	});
	const label = createElement("span", {
		"data-component": "text",
		className: classes.label,
		textContent: cloneLabels(activeTarget).button,
	});

	content.appendChild(label);
	button.appendChild(content);
	// Read the active target at click time so the action always matches the
	// current choice, even if it changed since the panel was built.
	button.addEventListener("click", () => activateClone(activeTarget, repoInfo));
	return button;
}

/**
 * Copies the class names from GitHub's live green "Code" button (identified by
 * its code octicon). Primer's CSS-module hashes rotate on every GitHub
 * rebuild, so hardcoding them would drop the green styling the next time
 * GitHub ships; every primary Primer button shares the same hashed classes,
 * so cloning from the live DOM keeps us green across rotations.
 */
function resolveButtonClasses(): {
	base: string;
	content: string;
	label: string;
} {
	const primaryButtons = Array.from(
		document.querySelectorAll<HTMLButtonElement>(
			'button[data-variant="primary"]'
		)
	);
	const nativeButton =
		primaryButtons.find((btn) => btn.querySelector(".octicon-code")) ??
		primaryButtons[0];

	if (!nativeButton) return { ...FALLBACK_CLASSES.button };

	const content = nativeButton.querySelector(
		'[data-component="buttonContent"]'
	);
	const label = nativeButton.querySelector('[data-component="text"]');

	return {
		base: nativeButton.className || FALLBACK_CLASSES.button.base,
		content: content?.className || FALLBACK_CLASSES.button.content,
		label: label?.className || FALLBACK_CLASSES.button.label,
	};
}

/**
 * Performs the chosen action for `target`: an editor gets a clone deep-link
 * handoff; the archive target downloads a .zip of the branch the page is
 * showing. Both URLs are built (and validated) from the live repo info at call
 * time, so a malformed owner/repo simply no-ops rather than firing a bad link.
 */
function activateClone(target: CloneTarget, repoInfo: RepositoryInfo): void {
	const { owner, repo } = repoInfo;

	if (target.kind === "archive") {
		const archiveUrl = buildArchiveUrl(owner, repo, detectBranch());
		if (archiveUrl) downloadArchive(archiveUrl);
		return;
	}

	const cloneUrl = buildCloneUrl(target.urlScheme, owner, repo);
	if (cloneUrl) {
		// Prefer location.href over window.open(_blank): the external scheme hands
		// off to the OS without navigating GitHub away, and avoids the dangling
		// blank tab _blank can leave behind.
		window.location.href = cloneUrl;
	}
}

/**
 * Starts the .zip download without navigating GitHub away. The archive lives
 * on github.com (same origin as this content script), so a programmatic anchor
 * with the `download` attribute downloads rather than navigates; GitHub then
 * 302s to codeload, whose `Content-Disposition: attachment` carries the proper
 * `repo-<branch>.zip` filename. The element is appended only long enough to be
 * clicked (some browsers require it in the document) and removed immediately.
 */
function downloadArchive(url: string): void {
	const link = document.createElement("a");
	link.href = url;
	link.download = "";
	link.rel = "noopener";
	document.body.appendChild(link);
	link.click();
	link.remove();
}
