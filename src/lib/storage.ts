import { DEFAULT_TARGET_ID } from "./clone-targets";

// The user's chosen clone target is the extension's only piece of state. It is
// a single preference, so it lives in chrome.storage.sync: it follows the user
// across their signed-in browsers and is read by both the popup (which writes
// the choice) and the content script (which clones with it). Requires the
// "storage" permission in the manifest.
const STORAGE_KEY = "cloneTargetId";

// chrome.storage only exists once the "storage" permission is granted — and a
// freshly added permission isn't live until the extension is reloaded. Resolve
// the namespace through this one guard so a missing/not-yet-applied permission
// degrades to "don't persist" (defaulting to VS Code) instead of
// throwing an uncaught rejection in the popup. `typeof chrome` guards
// non-extension contexts
// (tests, a popup opened as a plain file).
function storageApi() {
	return typeof chrome !== "undefined" ? chrome.storage : undefined;
}

/**
 * Reads the persisted clone-target id, resolving to the default target's id
 * when nothing is stored yet or storage is unavailable, so the caller always
 * gets a usable id without its own error handling.
 */
export async function loadSelectedTargetId(): Promise<string> {
	try {
		const sync = storageApi()?.sync;
		if (!sync) return DEFAULT_TARGET_ID;

		const stored = await sync.get(STORAGE_KEY);
		const id = stored[STORAGE_KEY];
		return typeof id === "string" ? id : DEFAULT_TARGET_ID;
	} catch {
		return DEFAULT_TARGET_ID;
	}
}

/**
 * Persists the chosen clone-target id. Best-effort: the UI already reflects the
 * choice, so a missing storage API or a write failure is swallowed rather than
 * surfaced as an uncaught rejection — the choice simply isn't remembered.
 */
export async function saveSelectedTargetId(id: string): Promise<void> {
	try {
		await storageApi()?.sync?.set({ [STORAGE_KEY]: id });
	} catch {
		// Ignore: persistence is best-effort.
	}
}

/**
 * Invokes `onChange` with the new id whenever the stored choice changes,
 * letting an already-open page (the content script) react to a selection made
 * in the popup without a reload. Ignores changes to other keys and areas, and
 * is a no-op when storage is unavailable.
 */
export function watchSelectedTargetId(onChange: (id: string) => void): void {
	const onChanged = storageApi()?.onChanged;
	if (!onChanged) return;

	onChanged.addListener((changes, area) => {
		if (area !== "sync") return;
		const change = changes[STORAGE_KEY];
		if (change && typeof change.newValue === "string") {
			onChange(change.newValue);
		}
	});
}
