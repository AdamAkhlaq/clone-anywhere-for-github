import { RepositoryDetector } from "./lib/repository";
import {
	findCloneMethodList,
	injectCloneTab,
	setActiveTarget,
} from "./lib/clone-dropdown";
import { loadSelectedTargetId, watchSelectedTargetId } from "./lib/storage";

// GitHub mounts every Primer overlay (including the Code dropdown) into this
// portal, which is `data-turbo-permanent`: it survives GitHub's SPA
// navigations, so one observer on it sees every dropdown open on every repo
// page for the life of the tab. It's also a tiny subtree, so watching it is
// far cheaper than watching the whole body.
const PORTAL_ROOT_SELECTORS = ["#__primerPortalRoot__", "[data-portal-root]"];

function findPortalRoot(): Element | null {
	for (const selector of PORTAL_ROOT_SELECTORS) {
		const root = document.querySelector(selector);
		if (root) return root;
	}
	return null;
}

/**
 * Injects the clone tab whenever GitHub renders its clone dropdown. Reacting
 * to the dropdown's own markup appearing, rather than to clicks on the Code
 * button or to navigation events, means there is nothing to find or bind up
 * front: a late-hydrated button, a re-rendered dropdown, or an SPA navigation
 * all lead to the same idempotent injection.
 */
class CloneDropdownWatcher {
	private readonly observer = new MutationObserver(() => this.sync());
	private root: Element | null = null;

	start(): void {
		this.observe();
		this.sync();
	}

	private observe(): void {
		const root = findPortalRoot() ?? document.body;
		if (root === this.root) return;

		this.observer.disconnect();
		this.root = root;
		this.observer.observe(root, { childList: true, subtree: true });
	}

	private sync(): void {
		// The body is only a stand-in until the portal root exists.
		if (this.root === document.body) this.observe();

		const list = findCloneMethodList(this.root ?? document);
		if (!list) return;

		const repoInfo = RepositoryDetector.detect();
		if (!repoInfo.isRepository) return;

		injectCloneTab(list, repoInfo);
	}
}

/**
 * Loads the persisted clone target and keeps it current. Runs async:
 * injection doesn't block on it, and once the choice resolves (or later
 * changes in the popup) any already-injected UI is relabelled in place.
 */
function trackTargetPreference(): void {
	void loadSelectedTargetId().then(setActiveTarget);
	watchSelectedTargetId(setActiveTarget);
}

function start(): void {
	trackTargetPreference();
	new CloneDropdownWatcher().start();
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", start);
} else {
	start();
}
