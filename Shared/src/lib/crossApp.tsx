import { useEffect } from "react";

/**
 * Cross-app navigation.
 *
 * Frontend and AdminPanel are separate bundles with separate routers, so moving
 * between them is a real document navigation — a react-router <Link>/<Navigate>
 * would just miss in the current app's route table and render its 404.
 *
 * In production both are served from one origin (site at `/`, admin at
 * `/admin/`), so a rooted path is enough and neither env var is needed. In dev
 * they are two Vite servers on two ports, so each app must be told where the
 * other lives — otherwise the admin panel redirects anonymous users to
 * `:8081/auth`, which its own dev server (base `/admin/`) refuses with
 * "did you mean to visit /admin/auth?".
 *
 * - `VITE_SITE_URL`  — set in AdminPanel: origin of the public site  (dev: http://localhost:8080)
 * - `VITE_ADMIN_URL` — set in Frontend: public origin proxying `/admin` (dev: http://localhost:8080)
 */
const SITE_ORIGIN = (import.meta.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");
const ADMIN_ORIGIN = (import.meta.env.VITE_ADMIN_URL ?? "").replace(/\/+$/, "");

/** The path prefix owned by the AdminPanel bundle. */
export const ADMIN_BASE = "/admin";

function rooted(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

/** Absolute (or rooted) URL for a path on the public site. */
export function siteUrl(path: string = "/"): string {
  return `${SITE_ORIGIN}${rooted(path)}`;
}

/**
 * Absolute (or rooted) URL for a path in the admin panel. Accepts either a full
 * "/admin/…" path or a path relative to the panel ("users" → "/admin/users").
 *
 * The panel root always keeps its trailing slash: the AdminPanel bundle is built
 * with `base: "/admin/"`, and both the Vite dev server and a static host serving
 * that base 404 on a bare "/admin".
 */
export function adminUrl(path: string = ADMIN_BASE): string {
  const p = rooted(path);
  const full = p === ADMIN_BASE || p.startsWith(`${ADMIN_BASE}/`) ? p : `${ADMIN_BASE}${p}`;
  return `${ADMIN_ORIGIN}${full === ADMIN_BASE ? `${ADMIN_BASE}/` : full}`;
}

/** True when `path` belongs to the AdminPanel bundle rather than the public app. */
export function isAdminPath(path: string): boolean {
  const p = rooted(path);
  return p === ADMIN_BASE || p.startsWith(`${ADMIN_BASE}/`) || p.startsWith(`${ADMIN_BASE}?`);
}

/**
 * Leaves the current app for `to`, replacing the history entry so Back doesn't
 * bounce the user straight into the redirect again. Renders nothing.
 */
export function CrossAppRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
}
