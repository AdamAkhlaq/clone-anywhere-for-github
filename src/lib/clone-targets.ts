// Single source of truth for the destinations the extension can clone a repo
// to. Most targets are a VS Code build (or a VS Code fork) that bundles the
// same built-in Git extension, so they clone through an identically shaped deep
// link — only the URL scheme differs (see `urlScheme` and clone-url.ts). The
// odd one out is the archive target, which downloads the repo as a .zip with no
// editor at all; the `kind` discriminant tells the two apart.
//
// Adding a destination is one entry in CLONE_TARGETS: the popup builds its
// selector from this array and the content script builds its button/tab/URL
// (and chooses deep-link vs. download) from the user's choice, so no other file
// needs to change.

// A monochrome brand glyph, rendered as a single SVG `<path>` filled with the
// target's brand colour. Kept as raw path data (not an asset file) so it ships
// inline with the extension and inherits no remote resource.
export interface CloneTargetIcon {
	// SVG viewBox the path is authored against (Simple Icons use "0 0 24 24";
	// the official VS Code mark uses "0 0 128 128").
	viewBox: string;
	// The `d` attribute of the glyph's single path.
	path: string;
	// Winding rule the path was authored for. The VS Code mark needs "evenodd"
	// for its inner cut-out; Simple Icons paths use the default "nonzero".
	fillRule?: "evenodd" | "nonzero";
}

// Fields every target shares regardless of `kind`. Kept separate so the
// editor/archive variants only declare what's unique to them.
interface CloneTargetBase {
	// Stable identifier persisted as the user's choice and emitted by the popup.
	id: string;
	// Human-facing label shown in the popup and woven into the injected
	// button/tab text (see cloneLabels in content.ts).
	label: string;
	// Brand glyph for the popup's selector and header tile.
	icon: CloneTargetIcon;
	// Brand colour for the glyph. Omit it to render the mark in the popup's
	// adaptive foreground (currentColor) — used for near-black brands (Cursor,
	// Windsurf) whose colour is the foreground anyway, so they need no light/dark
	// pair. When set, `colorDark` overrides it under prefers-color-scheme: dark,
	// defaulting to `color`.
	color?: string;
	colorDark?: string;
}

// A VS Code-family editor: clicking hands the repo off via a clone deep link.
export interface EditorTarget extends CloneTargetBase {
	kind: "editor";
	// Full base of the editor's clone deep link, e.g. `cursor://vscode.git/clone`.
	// clone-url.ts appends the validated `?url=…` query to this.
	urlScheme: string;
}

// The .zip option: clicking downloads a GitHub source archive — no editor, no
// deep link, so it carries no urlScheme (see buildArchiveUrl in clone-url.ts).
export interface ArchiveTarget extends CloneTargetBase {
	kind: "archive";
}

export type CloneTarget = EditorTarget | ArchiveTarget;

// The official VS Code mark (the blue ribbon). Shared by VS Code and its
// Insiders build, which is the same logo recoloured green.
const VSCODE_ICON: CloneTargetIcon = {
	viewBox: "0 0 128 128",
	path: "M90.767 127.126a7.968 7.968 0 0 0 6.35-.244l26.353-12.681a8 8 0 0 0 4.53-7.209V21.009a8 8 0 0 0-4.53-7.21L97.117 1.12a7.97 7.97 0 0 0-9.093 1.548l-50.45 46.026L15.6 32.013a5.328 5.328 0 0 0-6.807.302l-7.048 6.411a5.335 5.335 0 0 0-.006 7.888L20.796 64 1.74 81.387a5.336 5.336 0 0 0 .006 7.887l7.048 6.411a5.327 5.327 0 0 0 6.807.303l21.974-16.68 50.45 46.025a7.96 7.96 0 0 0 2.743 1.793Zm5.252-92.183L57.74 64l38.28 29.058V34.943Z",
	fillRule: "evenodd",
};

// A classic tabbed folder silhouette for the .zip download target — the one
// non-editor option, so it gets a generic file-system mark rather than a brand
// logo. Authored as a single filled path in the same 24×24 box as the brand
// glyphs and rendered in folder yellow (see the archive entry's colours).
const FOLDER_ICON: CloneTargetIcon = {
	viewBox: "0 0 24 24",
	path: "M10 4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6z",
};

// ── Clone-target registry ────────────────────────────────────────────────────
// Array order is the order shown in the popup. The default selection is keyed by
// DEFAULT_TARGET_ID (below), not by position, so this list can be reordered
// freely without changing which target is pre-selected.
export const CLONE_TARGETS: CloneTarget[] = [
	{
		// The one non-editor destination: a direct GitHub source archive download.
		// Listed first and set as the default (DEFAULT_TARGET_ID) so it leads the
		// popup and is pre-selected.
		kind: "archive",
		id: "zip",
		label: ".zip",
		icon: FOLDER_ICON,
		// Classic folder yellow, nudged brighter in dark mode for legibility on
		// the near-black canvas.
		color: "#F4B400",
		colorDark: "#F8C84E",
	},
	{
		kind: "editor",
		id: "cursor",
		label: "Cursor",
		urlScheme: "cursor://vscode.git/clone",
		icon: {
			viewBox: "0 0 24 24",
			path: "M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23",
		},
		// Cursor's mark is near-black; omit a brand colour so it renders in the
		// popup's adaptive foreground (currentColor) — legible on both canvases.
	},
	{
		kind: "editor",
		id: "vscode",
		label: "VS Code",
		urlScheme: "vscode://vscode.git/clone",
		icon: VSCODE_ICON,
		color: "#007ACC",
		colorDark: "#3FA7F4",
	},
	{
		kind: "editor",
		id: "windsurf",
		label: "Windsurf",
		urlScheme: "windsurf://vscode.git/clone",
		icon: {
			viewBox: "0 0 24 24",
			path: "M23.55 5.067c-1.2038-.002-2.1806.973-2.1806 2.1765v4.8676c0 .972-.8035 1.7594-1.7597 1.7594-.568 0-1.1352-.286-1.4718-.7659l-4.9713-7.1003c-.4125-.5896-1.0837-.941-1.8103-.941-1.1334 0-2.1533.9635-2.1533 2.153v4.8957c0 .972-.7969 1.7594-1.7596 1.7594-.57 0-1.1363-.286-1.4728-.7658L.4076 5.1598C.2822 4.9798 0 5.0688 0 5.2882v4.2452c0 .2147.0656.4228.1884.599l5.4748 7.8183c.3234.462.8006.8052 1.3509.9298 1.3771.313 2.6446-.747 2.6446-2.0977v-4.893c0-.972.7875-1.7593 1.7596-1.7593h.003a1.798 1.798 0 0 1 1.4718.7658l4.9723 7.0994c.4135.5905 1.05.941 1.8093.941 1.1587 0 2.1515-.9645 2.1515-2.153v-4.8948c0-.972.7875-1.7594 1.7596-1.7594h.194a.22.22 0 0 0 .2204-.2202v-4.622a.22.22 0 0 0-.2203-.2203Z",
		},
		// Windsurf's wordmark is near-black; omit a brand colour so it renders in
		// the adaptive foreground too.
	},
	{
		kind: "editor",
		id: "vscodium",
		label: "VSCodium",
		urlScheme: "vscodium://vscode.git/clone",
		icon: {
			viewBox: "0 0 24 24",
			path: "M11.583.54a1.467 1.467 0 0 0-.441 2.032c2.426 3.758 2.999 6.592 2.75 9.075-1.004 4.756-3.187 5.721-5.094 5.721-1.863 0-1.364-3.065.036-3.962.836-.522 1.906-.861 2.728-.861.814 0 1.474-.658 1.474-1.47 0-.812-.66-1.47-1.474-1.47-.96 0-1.901.202-2.78.545.18-.847.246-1.762.014-2.735-.352-1.477-1.367-2.889-3.128-4.257a1.476 1.476 0 0 0-2.069.256c-.5.64-.384 1.564.259 2.063 1.435 1.114 1.908 1.939 2.07 2.618.162.679.032 1.407-.293 2.408-.416 1.349-.9 2.553-1.11 3.708-.105.568-.114 1.187-.14 1.68-1.034-1.006-1.438-2.336-1.438-4.279 0-.811-.66-1.47-1.474-1.47-.814.001-1.473.659-1.473 1.47 0 2.654.776 5.179 2.855 6.863 1.883 1.793 6.67 1.13 6.67 4.01 0 .812 1.19 1.208 2.004 1.208.834 0 1.885-.558 1.885-1.208 0-3.267 3.443-5.253 9.11-5.244A1.472 1.472 0 0 0 24 15.773 1.472 1.472 0 0 0 22.53 14.3c-.388 0-.765.013-1.138.035.634-1.49.915-3.13.857-4.903a1.473 1.473 0 0 0-1.522-1.42 1.472 1.472 0 0 0-1.425 1.517c.076 2.32-.01 4.393-1.74 5.485-.49.31-1.062.58-1.604.58.42-1.145.738-2.353.869-3.655.083-.83.091-1.818-.003-2.585-.148-1.188-.325-2.535.126-3.55.405-.874 1.313-1.24 2.645-1.24.814 0 1.473-.659 1.473-1.47 0-.811-.659-1.47-1.473-1.47-1.98 0-3.481 1.042-4.332 2.3-.445-.95-.987-1.929-1.642-2.943a1.474 1.474 0 0 0-2.037-.44z",
		},
		color: "#2F80ED",
		colorDark: "#5C9DF5",
	},
	{
		kind: "editor",
		id: "vscode-insiders",
		label: "VS Code Insiders",
		urlScheme: "vscode-insiders://vscode.git/clone",
		icon: VSCODE_ICON,
		color: "#1F9E84",
		colorDark: "#2BD4B8",
	},
];

// The target assumed when nothing is stored yet, and the fallback whenever a
// persisted id no longer matches a known target.
export const DEFAULT_TARGET_ID = "vscode";

/**
 * Resolves a stored id to its CloneTarget, falling back to the default target
 * (VS Code) for unknown, missing, or stale ids so callers always get
 * a usable target without their own null handling.
 */
export function getCloneTarget(id: string | null | undefined): CloneTarget {
	return (
		CLONE_TARGETS.find((target) => target.id === id) ??
		CLONE_TARGETS.find((target) => target.id === DEFAULT_TARGET_ID) ??
		CLONE_TARGETS[0]
	);
}
