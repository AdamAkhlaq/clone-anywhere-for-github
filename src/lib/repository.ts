import { OWNER_PATTERN, REPO_PATTERN } from "./github-names";

export interface RepositoryInfo {
	owner: string;
	repo: string;
	isRepository: boolean;
}

// GitHub reserves these first path segments for its own pages, so an
// `/<segment>/<segment>`-shaped URL whose owner is one of them (e.g.
// `/marketplace/actions`, `/settings/profile`) is never a repository. They all
// satisfy OWNER_PATTERN, so the charset check alone can't exclude them.
const RESERVED_OWNERS = new Set([
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
]);

/**
 * Reads the owner/repo from a github.com path. The content script only runs on
 * github.com, so the host needs no check here. Allow-list, not deny-list: a
 * repository is confirmed only when the first two segments match GitHub's name
 * charset and the owner isn't a reserved route, which rejects profiles, the
 * root, and reserved pages without enumerating every non-repo URL shape.
 */
export function detectRepository(
	pathname: string = window.location.pathname
): RepositoryInfo {
	const [owner = "", repo = ""] = pathname.slice(1).split("/");

	const isRepository =
		OWNER_PATTERN.test(owner) &&
		REPO_PATTERN.test(repo) &&
		!RESERVED_OWNERS.has(owner.toLowerCase());

	return {
		owner: isRepository ? owner : "",
		repo: isRepository ? repo : "",
		isRepository,
	};
}
