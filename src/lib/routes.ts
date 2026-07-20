/**
 * Route constants + the `?next=` param contract (single source of truth).
 * See docs/plans/02-auth-flow.md §4.1 and §5.
 */

// Plan 03 mounts the real /dashboard page. Until then a placeholder route
// (App.tsx) redirects /dashboard → /directory. TODO(plan-03): remove placeholder.
export const DEFAULT_AUTHED_ROUTE = "/dashboard";
export const POST_SIGNUP_ROUTE = "/dashboard";
export const AUTH_ROUTE = "/auth";

/**
 * Only allow same-origin path redirects. Rejects absolute URLs, protocol-relative
 * ("//evil.com"), backslash tricks ("/\\evil.com"), and anything not starting with a
 * single "/". Returns `fallback` otherwise. Closes the open-redirect hole.
 */
export function sanitizeNext(
  raw: string | null | undefined,
  fallback: string = DEFAULT_AUTHED_ROUTE
): string {
  if (!raw) return fallback;
  const value = raw.trim();
  // Must be a rooted path.
  if (!value.startsWith("/")) return fallback;
  // Reject protocol-relative ("//host") and backslash-normalised ("/\\host").
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Reject whitespace / control chars that could smuggle a scheme or header.
  if (/\s/.test(value)) return fallback;
  return value;
}

/** Build "/auth?next=<encoded pathname+search>" preserving the current location. */
export function authPathWithNext(location: { pathname: string; search: string }): string {
  const next = `${location.pathname}${location.search}`;
  return `${AUTH_ROUTE}?next=${encodeURIComponent(next)}`;
}
