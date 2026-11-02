// Fallback for the .zip archive URL, used only when GitHub's own "Download ZIP"
// link can't be read from the Code dropdown (see findNativeArchiveUrl in
// clone-dropdown.ts). It needs the ref the user is looking at so the download
// matches what GitHub would serve (and lands a clean `repo-<branch>.zip`
// filename). We read it from the live page rather than guess: GitHub's ref
// switcher button in the file-navigation header names the current branch,
// including on the repo root where the URL omits it.
//
// A WRONG ref 404s the download, so detection is conservative: it returns a ref
// only when it's confident the page shows a branch, and null otherwise. Every
// caller falls back to the name-agnostic `HEAD` archive on null (see
// buildArchiveUrl), so an uncertain read degrades to "default branch" rather
// than breaking the download.

/**
 * Resolves the branch the page is showing, or null when it can't be determined.
 * Trusts the ref-switcher button (authoritative, present even on the repo root,
 * and slash-ref-safe) as long as it agrees with the `/tree|blob/<ref>` part of
 * the URL. They disagree on a commit, which GitHub's switcher labels
 * "<short sha> branch" while the URL holds the full hash. Without a switcher,
 * the first URL ref segment is the best guess. Defaults read the live
 * document/location so callers stay parameter-free; tests pass explicit values
 * to exercise every shape.
 */
export function detectBranch(
	pathname: string = window.location.pathname,
	doc: Document = document
): string | null {
	const urlRef = readRefFromUrl(pathname);
	const switcher = findRefSwitcher(doc);
	if (!switcher) {
		return urlRef?.split("/")[0] || null;
	}

	const branch = readBranchFromSwitcher(switcher);
	const agreesWithUrl =
		urlRef === null || urlRef === branch || urlRef.startsWith(`${branch}/`);
	return branch && agreesWithUrl ? branch : null;
}

/**
 * Finds GitHub's ref-switcher button. We target the button specifically via its
 * stable hooks (the `overview-ref-selector` class, the `ref-selector` id, or the
 * "Switch branches/tags" name), NOT the git-branch octicon alone, which the
 * "Branches"/"Tags" overview links also carry and which once made detection
 * return "Branches" and 404 the download.
 *
 * READMEs and comments can carry `<a id="ref-selector" aria-label="…">`: GitHub
 * keeps the aria-label and only prefixes the id with `user-content-`, which
 * still contains "ref-selector". Such ids are excluded so page content can
 * never choose the ref.
 */
function findRefSwitcher(doc: Document): Element | null {
	return doc.querySelector(
		'[class~="overview-ref-selector"], [id*="ref-selector"]:not([id^="user-content-"]), [data-icv-name="Switch branches/tags"]'
	);
}

/**
 * Reads the ref from the switcher's aria-label, which ends in " branch" only
 * when a branch or commit (not a tag) is checked out. Anything else returns
 * null → HEAD fallback.
 */
function readBranchFromSwitcher(switcher: Element): string | null {
	const label = switcher.getAttribute("aria-label")?.trim() ?? "";
	const suffix = " branch";
	if (!label.endsWith(suffix)) {
		return null;
	}

	const ref = label.slice(0, -suffix.length).trim();
	// Refs never contain whitespace; reject a malformed read just in case.
	return ref && !/\s/.test(ref) ? ref : null;
}

/**
 * Returns everything after `/<owner>/<repo>/(tree|blob)/`, decoded, or null on
 * any other page. That is the ref plus any file path, which can't be told apart
 * when the ref itself contains "/".
 */
function readRefFromUrl(pathname: string): string | null {
	const segments = pathname.split("/").filter(Boolean);
	const isRefView = segments[2] === "tree" || segments[2] === "blob";
	if (!isRefView || !segments[3]) {
		return null;
	}

	try {
		return segments.slice(3).map(decodeURIComponent).join("/");
	} catch {
		return null;
	}
}
