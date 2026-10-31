import {
	CLONE_TARGETS,
	CloneTarget,
	DEFAULT_TARGET_ID,
	getCloneTarget,
} from "./lib/clone-targets";
import { loadSelectedTargetId, saveSelectedTargetId } from "./lib/storage";

// Toolbar-popup behaviour: render the shared CLONE_TARGETS list (clone-targets.ts)
// as an accessible radiogroup so adding an editor is a one-place change. Each row
// shows the editor's brand glyph in its brand colour; choosing a row persists the
// choice (chrome.storage.sync) and the content script picks it up, even on an
// already-open GitHub tab. The header destination tile mirrors the selection.

const SVG_NS = "http://www.w3.org/2000/svg";

// Coloured brand marks are theme-aware (their light/dark hexes differ), so
// resolve against the live colour scheme and recolour the inline `fill`
// attributes on change, matching the popup's no-inline-style convention (colour
// lives on `fill`, never a style attribute). Targets without a brand colour use
// `currentColor`, so CSS adapts them to light/dark for free, like the GitHub mark.
const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");

function brandColor(target: CloneTarget): string {
	if (!target.color) return "currentColor";
	return darkScheme.matches ? (target.colorDark ?? target.color) : target.color;
}

function createGlyph(target: CloneTarget): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("viewBox", target.icon.viewBox);
	svg.setAttribute("fill", brandColor(target));
	svg.setAttribute("aria-hidden", "true");
	svg.setAttribute("focusable", "false");

	const path = document.createElementNS(SVG_NS, "path");
	path.setAttribute("d", target.icon.path);
	if (target.icon.fillRule) {
		path.setAttribute("fill-rule", target.icon.fillRule);
	}

	svg.appendChild(path);
	return svg;
}

class TargetPicker {
	private readonly group: HTMLElement;
	private readonly headerTile: HTMLElement;
	private readonly options = new Map<string, HTMLElement>();

	constructor(group: HTMLElement, headerTile: HTMLElement) {
		this.group = group;
		this.headerTile = headerTile;
	}

	// The current choice is whichever row carries aria-checked; deriving it keeps
	// the DOM the single source of truth instead of a parallel field that select()
	// must remember to update. Falls back to the default before the first select.
	private get selectedId(): string {
		for (const [id, option] of this.options) {
			if (option.getAttribute("aria-checked") === "true") return id;
		}
		return DEFAULT_TARGET_ID;
	}

	async init(): Promise<void> {
		this.buildOptions();
		const stored = getCloneTarget(await loadSelectedTargetId());
		// Reflect the stored choice without persisting it back or stealing focus
		// from the freshly opened popup.
		this.select(stored.id, { persist: false, focus: false });
		darkScheme.addEventListener("change", () => this.recolor());
	}

	private buildOptions(): void {
		for (const target of CLONE_TARGETS) {
			const option = this.createOption(target);
			this.options.set(target.id, option);
			this.group.appendChild(option);
		}
	}

	private createOption(target: CloneTarget): HTMLElement {
		const option = document.createElement("div");
		option.className = "popup__option";
		option.id = `clone-target-option-${target.id}`;
		option.setAttribute("role", "radio");
		option.setAttribute("aria-checked", "false");
		option.tabIndex = -1;
		option.dataset.id = target.id;

		const icon = document.createElement("span");
		icon.className = "popup__option-icon";
		icon.appendChild(createGlyph(target));

		const label = document.createElement("span");
		label.className = "popup__option-label";
		label.textContent = target.label;

		option.append(icon, label);

		option.addEventListener("click", () => this.select(target.id));
		option.addEventListener("keydown", (event) => this.onKeydown(event));

		return option;
	}

	// Radiogroup keyboard model: selection follows focus, so the arrow keys move
	// the choice (and commit it, since it's a live preference). The focused row is
	// always the selected one, so Enter/Space need only swallow the keypress
	// (e.g. Space's page-scroll); the row is already chosen.
	private onKeydown(event: KeyboardEvent): void {
		const ids = CLONE_TARGETS.map((target) => target.id);
		const current = ids.indexOf(this.selectedId);

		let next: number;
		switch (event.key) {
			case "ArrowDown":
			case "ArrowRight":
				next = (current + 1) % ids.length;
				break;
			case "ArrowUp":
			case "ArrowLeft":
				next = (current - 1 + ids.length) % ids.length;
				break;
			case "Home":
				next = 0;
				break;
			case "End":
				next = ids.length - 1;
				break;
			case " ":
			case "Enter":
				event.preventDefault();
				return;
			default:
				return;
		}

		event.preventDefault();
		this.select(ids[next]);
	}

	private select(
		id: string,
		options: { persist?: boolean; focus?: boolean } = {}
	): void {
		const { persist = true, focus = true } = options;
		const target = getCloneTarget(id);

		// Roving tabindex: only the checked row is in the tab order, so Tab lands
		// on the current choice and arrow keys take over from there.
		for (const [optionId, option] of this.options) {
			const isSelected = optionId === target.id;
			option.setAttribute("aria-checked", String(isSelected));
			option.tabIndex = isSelected ? 0 : -1;
		}

		if (focus) {
			this.options.get(target.id)?.focus();
		}

		this.setHeaderTile(target);

		if (persist) {
			// Fire-and-forget: the checked state and header tile already updated,
			// so a rare storage failure only means the choice isn't remembered.
			void saveSelectedTargetId(target.id);
		}
	}

	private setHeaderTile(target: CloneTarget): void {
		this.headerTile.replaceChildren(createGlyph(target));
	}

	private recolor(): void {
		for (const [id, option] of this.options) {
			option
				.querySelector("svg")
				?.setAttribute("fill", brandColor(getCloneTarget(id)));
		}
		this.setHeaderTile(getCloneTarget(this.selectedId));
	}
}

const group = document.getElementById("clone-target");
const headerTile = document.getElementById("clone-target-tile");
if (group && headerTile) {
	void new TargetPicker(group, headerTile).init();
}
