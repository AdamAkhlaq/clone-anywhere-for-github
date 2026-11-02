import { describe, expect, it } from "vitest";
import { buildArchiveUrl, buildCloneUrl, verifyArchiveUrl } from "./clone-url";
import { CLONE_TARGETS, EditorTarget } from "./clone-targets";

const VSCODE_SCHEME = "vscode://vscode.git/clone";

const EDITOR_TARGETS = CLONE_TARGETS.filter(
	(target): target is EditorTarget => target.kind === "editor"
);

describe("buildCloneUrl", () => {
	it("builds the deep link for a normal owner/repo", () => {
		expect(buildCloneUrl(VSCODE_SCHEME, "facebook", "react")).toBe(
			"vscode://vscode.git/clone?url=https://github.com/facebook/react.git"
		);
	});

	it("accepts repo names with dots, underscores, and hyphens", () => {
		expect(buildCloneUrl(VSCODE_SCHEME, "my-org", "my.cool_repo-v2")).toBe(
			"vscode://vscode.git/clone?url=https://github.com/my-org/my.cool_repo-v2.git"
		);
	});

	it("honours the target's scheme without touching the rest of the link", () => {
		expect(
			buildCloneUrl("cursor://vscode.git/clone", "facebook", "react")
		).toBe(
			"cursor://vscode.git/clone?url=https://github.com/facebook/react.git"
		);
		expect(
			buildCloneUrl("vscode-insiders://vscode.git/clone", "facebook", "react")
		).toBe(
			"vscode-insiders://vscode.git/clone?url=https://github.com/facebook/react.git"
		);
	});

	it("builds a valid link for every registered editor target", () => {
		for (const target of EDITOR_TARGETS) {
			expect(buildCloneUrl(target.urlScheme, "facebook", "react")).toBe(
				`${target.urlScheme}?url=https://github.com/facebook/react.git`
			);
		}
	});

	it.each([
		["empty owner", "", "react"],
		["empty repo", "facebook", ""],
		["whitespace in repo", "facebook", "re act"],
		["query character in repo", "facebook", "react?foo=bar"],
		["slash in owner", "face/book", "react"],
		["dot in owner", "face.book", "react"],
	])("returns null for %s", (_label, owner, repo) => {
		expect(buildCloneUrl(VSCODE_SCHEME, owner, repo)).toBeNull();
	});
});

describe("buildArchiveUrl", () => {
	it("targets a named branch with the ref-archive form", () => {
		expect(buildArchiveUrl("facebook", "react", "main")).toBe(
			"https://github.com/facebook/react/archive/refs/heads/main.zip"
		);
	});

	it.each([
		["no branch", undefined],
		["null branch", null],
		["empty branch", ""],
		["whitespace-only branch", "   "],
		["branch with whitespace", "feature x"],
		["parent-directory segment", "../../../../../octocat/Hello-World/x"],
		["current-directory segment", "./main"],
		["segment starting with a dot", "release/.hidden"],
		["empty segment", "release//v2"],
		["trailing slash", "main/"],
	])("falls back to HEAD for %s", (_label, branch) => {
		expect(buildArchiveUrl("facebook", "react", branch)).toBe(
			"https://github.com/facebook/react/archive/HEAD.zip"
		);
	});

	it("keeps the slashes in a nested ref but escapes each segment", () => {
		expect(buildArchiveUrl("my-org", "repo", "release/v2.0")).toBe(
			"https://github.com/my-org/repo/archive/refs/heads/release/v2.0.zip"
		);
	});

	it("escapes reserved characters in a branch segment", () => {
		expect(buildArchiveUrl("my-org", "repo", "fix#42")).toBe(
			"https://github.com/my-org/repo/archive/refs/heads/fix%2342.zip"
		);
	});

	it("trims surrounding whitespace before using the branch", () => {
		expect(buildArchiveUrl("facebook", "react", "  main  ")).toBe(
			"https://github.com/facebook/react/archive/refs/heads/main.zip"
		);
	});

	it.each([
		["empty owner", "", "react"],
		["empty repo", "facebook", ""],
		["slash in owner", "face/book", "react"],
		["dot in owner", "face.book", "react"],
	])("returns null for %s", (_label, owner, repo) => {
		expect(buildArchiveUrl(owner, repo, "main")).toBeNull();
	});
});

describe("verifyArchiveUrl", () => {
	const ARCHIVE = "https://github.com/my-org/repo/archive";

	it.each([
		["a branch", `${ARCHIVE}/refs/heads/main.zip`],
		["a nested branch", `${ARCHIVE}/refs/heads/release/v2.zip`],
		["a tag", `${ARCHIVE}/refs/tags/v1.2.0.zip`],
		["a commit", `${ARCHIVE}/02a52ae40c50a66d732ab0b823516b8f6318f65a.zip`],
	])("accepts this repo's archive of %s", (_label, href) => {
		expect(verifyArchiveUrl(href, "my-org", "repo")).toBe(href);
	});

	it("compares owner and repo case-insensitively, as GitHub does", () => {
		const href = "https://github.com/My-Org/Repo/archive/refs/heads/main.zip";
		expect(verifyArchiveUrl(href, "my-org", "repo")).toBe(href);
	});

	it.each([
		["another repo", "https://github.com/octocat/repo/archive/HEAD.zip"],
		[
			"a dot-segment escape to another repo",
			`${ARCHIVE}/../../../octocat/repo/archive/HEAD.zip`,
		],
		[
			"a repo whose name extends this one",
			"https://github.com/my-org/repo-evil/archive/HEAD.zip",
		],
		["another host", "https://example.com/my-org/repo/archive/HEAD.zip"],
		["plain http", "http://github.com/my-org/repo/archive/HEAD.zip"],
		["a non-archive path", "https://github.com/my-org/repo/releases/x.zip"],
		["a non-zip archive", `${ARCHIVE}/HEAD.tar.gz`],
		["a query string", `${ARCHIVE}/HEAD.zip?x=1`],
		["a fragment", `${ARCHIVE}/HEAD.zip#x`],
		["a relative URL", "/my-org/repo/archive/HEAD.zip"],
		["a javascript: URL", "javascript:alert(1)//archive/x.zip"],
	])("rejects %s", (_label, href) => {
		expect(verifyArchiveUrl(href, "my-org", "repo")).toBeNull();
	});

	it("rejects anything when owner/repo are invalid", () => {
		expect(
			verifyArchiveUrl(`${ARCHIVE}/HEAD.zip`, "my-org", "repo?x")
		).toBeNull();
	});
});
