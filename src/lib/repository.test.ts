import { describe, expect, it } from "vitest";
import { detectRepository } from "./repository";

describe("detectRepository", () => {
	it("detects a repository from an owner/repo URL", () => {
		expect(detectRepository("/facebook/react")).toEqual({
			owner: "facebook",
			repo: "react",
			isRepository: true,
		});
	});

	it("detects a repository from a deeper repo sub-page", () => {
		expect(detectRepository("/facebook/react/issues/42")).toEqual({
			owner: "facebook",
			repo: "react",
			isRepository: true,
		});
	});

	it("rejects single-segment paths such as a user profile", () => {
		expect(detectRepository("/facebook")).toEqual({
			owner: "",
			repo: "",
			isRepository: false,
		});
	});

	it("rejects the github.com root", () => {
		expect(detectRepository("/")).toEqual({
			owner: "",
			repo: "",
			isRepository: false,
		});
	});

	it("rejects an empty repo segment (trailing slash)", () => {
		const result = detectRepository("/facebook/");
		expect(result.isRepository).toBe(false);
	});

	it("detects repo names containing dots, underscores, and hyphens", () => {
		expect(detectRepository("/my-org/my.repo_name-1")).toEqual({
			owner: "my-org",
			repo: "my.repo_name-1",
			isRepository: true,
		});
	});

	it.each([
		"orgs",
		"users",
		"settings",
		"notifications",
		"marketplace",
		"sponsors",
		"explore",
		"topics",
		"trending",
		"collections",
		"features",
		"pricing",
		"about",
		"apps",
		"codespaces",
		"dashboard",
		"new",
		"login",
		"join",
	])("excludes the reserved top-level route %s", (reserved) => {
		const result = detectRepository(`/${reserved}/anything`);
		expect(result.isRepository).toBe(false);
	});

	it("excludes a reserved route regardless of casing", () => {
		const result = detectRepository("/Marketplace/actions");
		expect(result.isRepository).toBe(false);
	});

	it("rejects an owner segment outside GitHub's name charset", () => {
		const result = detectRepository("/foo~bar/repo");
		expect(result.isRepository).toBe(false);
	});
});
