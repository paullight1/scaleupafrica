/**
 * One source of truth for Cresciva's public production origin.
 *
 * This module deliberately has no Node-only or browser-only dependencies so it
 * can be imported by Vite config, browser/shared code, and build scripts.
 */
export const DEFAULT_SITE_ORIGIN = "https://cresciva.vercel.app";

/** Normalize an explicit deployment override or fall back to production. */
export function normalizeSiteOrigin(value = DEFAULT_SITE_ORIGIN) {
  const raw = String(value || DEFAULT_SITE_ORIGIN).trim();
  const parsed = new URL(raw);
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("Site origin must contain only scheme + host (no path, query, or hash)." );
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    throw new Error("Production/preview site origins must use HTTPS.");
  }
  return parsed.origin;
}
