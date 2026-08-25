import { SITE_ORIGIN } from "@shared/lib/siteMeta";

type AuthOriginInput = {
  hostname: string;
  origin: string;
  siteOrigin?: string;
};

/**
 * Keep local auth round-trips local, but never issue production emails that
 * point at an ephemeral preview deployment (or a retired Vercel alias).
 */
export function resolveAuthOrigin({
  hostname,
  origin,
  siteOrigin = SITE_ORIGIN,
}: AuthOriginInput): string {
  return hostname === "localhost" || hostname === "127.0.0.1" ? origin : siteOrigin;
}

export function authRedirectUrl(path: string): string {
  const rootedPath = path.startsWith("/") ? path : `/${path}`;
  const origin = resolveAuthOrigin({
    hostname: window.location.hostname,
    origin: window.location.origin,
  });
  return `${origin}${rootedPath}`;
}
