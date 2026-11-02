// The .zip archive URL needs the ref the user is looking at so the download
// matches GitHub's own "Download ZIP" (and lands a clean `repo-<branch>.zip`
// filename). We read it from the live page rather than guess: GitHub's ref
// switcher button in the file-navigation header names the current branch
// unambiguously, including on the repo root where the URL omits it.
//
// A WRONG ref 404s the download, so detection is conservative: it returns a ref
// only when it's confident the switcher shows a branch, and null otherwise.
// Every caller falls back to the name-agnostic `HEAD` archive on null (see
// buildArchiveUrl), so an uncertain read degrades to "default branch" rather
// than breaking the download.

/**
 * Resolves the branch the page is showing, or null when it can't be determined.
 * Tries the ref-switcher button first (authoritative, present even on the repo
 * root, and slash-ref-safe), then the `/tree|blob/<branch>` URL segment as a
 * fallback. Defaults read the live document/location so callers stay
 * parameter-free; tests pass explicit values to exercise every shape.
 */
export function detectBranch(
	pathname: string = window.location.pathname,
	doc: Document = document
): string | null {
	return readBranchFromRefSelector(doc) ?? readBranchFromUrl(pathname);
}

/**
 * Reads the current ref from GitHub's ref-switcher button. We target the button
 * specifically via its stable hooks (the `overview-ref-selector` class, the
 * `ref-selector` id, or the "Switch branches/tags" name), NOT the git-branch
 * octicon alone, which the "Branches"/"Tags" overview links also carry and which
 * once made detection return "Branches" and 404 the download.
 *
 * Its aria-label reads "<ref> branch" exactly when a branch (not a tag or commit)
 * is checked out, so it doubles as the ref and the proof that `refs/heads/<ref>`
 * is the right archive path. Anything else returns null → HEAD fallback.
 *
 * READMEs and comments can carry `<a id="ref-selector" aria-label="…">`: GitHub
 * keeps the aria-label and only prefixes the id with `user-content-`, which
 * still contains "ref-selector". Such ids are excluded so page content can
 * never choose the ref.
 */
function readBranchFromRefSelector(doc: Document): string | null {
	const button = doc.querySelector(
		'[class~="overview-ref-selector"], [id*="ref-selector"]:not([id^="user-content-"]), [data-icv-name="Switch branches/tags"]'
	);

	const label = button?.getAttribute("aria-label")?.trim() ?? "";
	const suffix = " branch";
	if (!label.endsWith(suffix)) {
		return null;
	}

	const ref = label.slice(0, -suffix.length).trim();
	// Refs never contain whitespace; reject a malformed read just in case.
	return ref && !/\s/.test(ref) ? ref : null;
}

/**
 * Pulls the branch from a `/<owner>/<repo>/(tree|blob)/<branch>[/…]` path. Only
 * the first segment after tree/blob is taken, so a ref containing "/" resolves
 * correctly only via the switcher above; this fallback covers the common
 * single-segment case when the switcher can't be read.
 */
function readBranchFromUrl(pathname: string): string | null {
	const segments = pathname.split("/").filter(Boolean);
	const isRefView = segments[2] === "tree" || segments[2] === "blob";
	return isRefView && segments[3] ? segments[3] : null;
}
