import { useEffect } from "react";

/**
 * Cross-app navigation.
 *
 * Frontend and AdminPanel are separate bundles with separate routers, so moving
 * between them is a real document navigation — a react-router <Link>/<Navigate>
 * would just miss in the current app's route table and render its 404.
 *
 * By default both are served from the same origin (site at `/`, admin at
 * `/admin/`), so a rooted path is enough. Set VITE_SITE_URL in the admin build
 * when the panel is hosted on its own domain.
 */
const SITE_ORIGIN = (import.meta.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");

/** Absolute (or rooted) URL for a path on the public site. */
export function siteUrl(path: string = "/"): string {
  const rooted = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${rooted}`;
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
