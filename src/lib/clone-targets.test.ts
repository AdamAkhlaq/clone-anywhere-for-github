import { describe, expect, it } from "vitest";
import {
	CLONE_TARGETS,
	DEFAULT_TARGET_ID,
	EditorTarget,
	getCloneTarget,
} from "./clone-targets";

const EDITOR_TARGETS = CLONE_TARGETS.filter(
	(target): target is EditorTarget => target.kind === "editor"
);

describe("CLONE_TARGETS", () => {
	it("has unique ids", () => {
		const ids = CLONE_TARGETS.map((target) => target.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("includes the default target", () => {
		expect(
			CLONE_TARGETS.some((target) => target.id === DEFAULT_TARGET_ID)
		).toBe(true);
	});

	it("clones through a vscode.git/clone handler for every editor target", () => {
		for (const target of EDITOR_TARGETS) {
			// Every editor is a VS Code build, so the deep link always routes
			// through the bundled Git extension's clone handler.
			expect(target.urlScheme).toMatch(/^[a-z-]+:\/\/vscode\.git\/clone$/);
		}
	});

	it("offers exactly one archive (.zip) target, with no deep-link scheme", () => {
		const archives = CLONE_TARGETS.filter(
			(target) => target.kind === "archive"
		);
		expect(archives).toHaveLength(1);
		// The archive downloads a file rather than handing off to an editor, so it
		// must carry no urlScheme: the type forbids it, this guards the data too.
		expect("urlScheme" in archives[0]).toBe(false);
	});

	it("gives every target a renderable glyph with a valid (or adaptive) colour", () => {
		for (const target of CLONE_TARGETS) {
			expect(target.icon.path.length).toBeGreaterThan(0);
			expect(target.icon.viewBox).toMatch(/^0 0 \d+ \d+$/);
			// A brand colour is optional (omitting it means "render in the
			// adaptive foreground"), but when present it must be a valid hex.
			if (target.color !== undefined) {
				expect(target.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
			}
		}
	});
});

describe("getCloneTarget", () => {
	it("resolves a known id", () => {
		expect(getCloneTarget("cursor").label).toBe("Cursor");
	});

	it.each([["unknown-id"], [""], [null], [undefined]])(
		"falls back to the default target for %s",
		(id) => {
			expect(getCloneTarget(id as string | null | undefined).id).toBe(
				DEFAULT_TARGET_ID
			);
		}
	);
});
