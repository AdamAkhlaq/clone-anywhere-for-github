import { OWNER_PATTERN, REPO_PATTERN } from "./github-names";

// owner/repo come straight from location.pathname, so a segment containing `?`,
// `#`, `&`, or whitespace would break out of the URL and inject parameters into
// the editor's protocol handler (or the download). Reject anything outside
// GitHub's name charset rather than hand a malformed URL onwards.

/**
 * Validates an owner/repo pair against GitHub's name charset and returns the
 * `https://github.com/<owner>/<repo>` base with both segments escaped, or null
 * when either is invalid. The single gate both URL builders below share, so the
 * validation rule and base shape can't drift between them.
 */
function repoBaseUrl(owner: string, repo: string): string | null {
	if (!OWNER_PATTERN.test(owner) || !REPO_PATTERN.test(repo)) {
		return null;
	}
	return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(
		repo
	)}`;
}

/**
 * Builds an editor clone deep link (`<scheme>?url=…`) for an owner/repo pair,
 * or returns null when either segment is invalid. `scheme` is the full base of
 * the target's clone handler, e.g. `vscode://vscode.git/clone` or
 * `cursor://vscode.git/clone` (see CLONE_TARGETS). Both path segments are
 * validated and escaped (see repoBaseUrl) so the link can never be malformed or
 * carry injected query parameters.
 */
export function buildCloneUrl(
	scheme: string,
	owner: string,
	repo: string
): string | null {
	const base = repoBaseUrl(owner, repo);
	return base ? `${scheme}?url=${base}.git` : null;
}

/**
 * Builds the GitHub source-archive (.zip) download URL for an owner/repo, or
 * null when either segment is invalid. With a branch it targets that ref
 * (`/archive/refs/heads/<branch>.zip`, the form GitHub's own "Download ZIP"
 * uses, which yields a `repo-<branch>.zip` filename); without one it falls back
 * to `/archive/HEAD.zip`, which GitHub resolves to the default branch without
 * us needing its name. owner/repo are validated and escaped via repoBaseUrl, and
 * the branch is sanitised per-segment (see normalizeBranch).
 */
export function buildArchiveUrl(
	owner: string,
	repo: string,
	branch?: string | null
): string | null {
	const base = repoBaseUrl(owner, repo);
	if (!base) {
		return null;
	}

	const ref = normalizeBranch(branch);
	return ref
		? `${base}/archive/refs/heads/${ref}.zip`
		: `${base}/archive/HEAD.zip`;
}

/**
 * Returns `href` as an absolute URL if it is a .zip source archive of this
 * owner/repo on github.com, or null otherwise. Lets the caller reuse the exact
 * archive link GitHub renders (which names the right ref for a branch, tag, or
 * commit) while guaranteeing it can't point at another repo or host. Parsing
 * first resolves any `.`/`..` segments, so the prefix check sees the real path.
 * GitHub names are case-insensitive, so the prefix is compared that way.
 */
export function verifyArchiveUrl(
	href: string,
	owner: string,
	repo: string
): string | null {
	const base = repoBaseUrl(owner, repo);
	if (!base) {
		return null;
	}

	let url: URL;
	try {
		url = new URL(href);
	} catch {
		return null;
	}

	const archivePrefix = `${new URL(base).pathname}/archive/`.toLowerCase();
	const isRepoArchive =
		url.origin === "https://github.com" &&
		url.pathname.toLowerCase().startsWith(archivePrefix) &&
		url.pathname.endsWith(".zip") &&
		!url.search &&
		!url.hash;
	return isRepoArchive ? url.href : null;
}

/**
 * Sanitises a detected branch for use in the archive path, or returns null so
 * the caller falls back to HEAD. Each "/"-delimited segment is escaped while the
 * slashes themselves are kept, so a nested ref (e.g. `release/v2`) keeps the
 * path shape GitHub expects yet no segment can break out of the URL. A blank or
 * whitespace-bearing value (refs never contain whitespace) is rejected outright.
 *
 * So is any empty segment or one starting with ".". Git forbids both in ref
 * names (git check-ref-format), and `.`/`..` survive encodeURIComponent, so the
 * browser would resolve them out of the repo's path and download another repo.
 */
function normalizeBranch(branch?: string | null): string | null {
	const trimmed = branch?.trim();
	if (!trimmed || /\s/.test(trimmed)) {
		return null;
	}
	const segments = trimmed.split("/");
	if (segments.some((segment) => segment === "" || segment.startsWith("."))) {
		return null;
	}
	return segments.map(encodeURIComponent).join("/");
}
