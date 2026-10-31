import { afterEach, describe, expect, it } from "vitest";
import { detectBranch } from "./branch";

// Builds a detached document whose markup mirrors the relevant bits of GitHub's
// file-navigation header, so the ref-switcher read can be exercised without a
// live page.
function docWith(markup: string): Document {
	return new DOMParser().parseFromString(
		`<!doctype html><body>${markup}</body>`,
		"text/html"
	);
}

// GitHub's ref-switcher button, mirroring the real one: the `overview-ref-selector`
// class and an `aria-label` of "<ref> branch" (the form that confirms a branch).
function refSwitcher(ariaLabel: string): string {
	return `<button class="prc-Button-ButtonBase overview-ref-selector" id="ref-picker-repos-header-ref-selector" data-icv-name="Switch branches/tags" aria-label="${ariaLabel}"></button>`;
}

// The "Branches" overview link: same git-branch octicon as the switcher, but a
// plain anchor to the branches page. Reading this once returned "Branches" and
// 404'd the download, so detection must ignore it.
const branchesLink =
	'<a href="/facebook/react/branches" aria-label="Go to Branches page">' +
	'<svg class="octicon octicon-git-branch"></svg>Branches</a>';

const emptyDoc = () => docWith("");

afterEach(() => {
	document.body.innerHTML = "";
});

describe("detectBranch", () => {
	it("reads the current ref from the switcher on the repo root", () => {
		const doc = docWith(refSwitcher("main branch"));
		// No /tree/ in the URL on the root, so this only resolves via the switcher.
		expect(detectBranch("/facebook/react", doc)).toBe("main");
	});

	it("prefers the switcher over the URL ref segment", () => {
		const doc = docWith(refSwitcher("develop branch"));
		expect(detectBranch("/facebook/react/tree/main", doc)).toBe("develop");
	});

	it("ignores the 'Branches' overview link (the 404 regression)", () => {
		// Only the overview link is present; its octicon must not be mistaken for
		// the switcher, so detection falls through to the URL (here, null → HEAD).
		expect(detectBranch("/facebook/react", docWith(branchesLink))).toBeNull();
	});

	it("uses the switcher even when the 'Branches' link is also present", () => {
		const doc = docWith(branchesLink + refSwitcher("main branch"));
		expect(detectBranch("/facebook/react", doc)).toBe("main");
	});

	it("keeps a nested ref intact from the switcher's aria-label", () => {
		const doc = docWith(refSwitcher("release/v2 branch"));
		expect(detectBranch("/my-org/repo", doc)).toBe("release/v2");
	});

	it("falls back to HEAD (null) when a tag is checked out, not a branch", () => {
		// A tag's aria-label is "<ref> tag" and refs/heads/<ref> would 404; the
		// default branch is a better download than a broken URL.
		const doc = docWith(refSwitcher("v1.2.3 tag"));
		expect(detectBranch("/facebook/react", doc)).toBeNull();
	});

	it("falls back to the /tree/<branch> URL segment", () => {
		expect(detectBranch("/facebook/react/tree/canary", emptyDoc())).toBe(
			"canary"
		);
	});

	it("reads the branch from a /blob/<branch>/<path> file view", () => {
		expect(
			detectBranch(
				"/facebook/react/blob/main/packages/react/index.js",
				emptyDoc()
			)
		).toBe("main");
	});

	it("takes the ref segment when browsing a subdirectory of a branch", () => {
		expect(detectBranch("/facebook/react/tree/main/packages", emptyDoc())).toBe(
			"main"
		);
	});

	it("returns null when neither the switcher nor the URL names a ref", () => {
		expect(detectBranch("/facebook/react", emptyDoc())).toBeNull();
	});
});
