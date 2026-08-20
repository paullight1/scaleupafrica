import { DEFAULT_SITE_ORIGIN, normalizeSiteOrigin } from "../../../config/site-origin.js";

/**
 * Canonical identity of the public site — the single source of truth for every
 * absolute URL that leaves the app: <link rel="canonical">, og:url, og:image,
 * and the JSON-LD helpers.
 *
 * Why not `window.location.origin`: canonical and og:* must name the production
 * site, not whatever host happens to be serving the bundle. Deriving them from
 * the live origin makes a Vercel preview deploy (and localhost) declare itself
 * canonical and hand crawlers an og:image URL that dies with the preview.
 *
 * `config/site-origin.js` owns the default literal. Deployments may override it
 * with VITE_SITE_ORIGIN; Node/build consumers import the same contract.
 */
export const SITE_NAME = "Cresciva";

export const SITE_ORIGIN = normalizeSiteOrigin(
  import.meta.env.VITE_SITE_ORIGIN ?? DEFAULT_SITE_ORIGIN,
);

/**
 * Social share image — a screenshot of the live landing hero, 1200×630.
 * Regenerate with `npm run og` after the hero changes.
 */
export const DEFAULT_OG_IMAGE = "/og-banner.png";
export const OG_IMAGE_WIDTH = "1200";
export const OG_IMAGE_HEIGHT = "630";
export const OG_IMAGE_ALT = "The Cresciva homepage — Pan-African SME directory and funding intelligence";

/**
 * Resolves a site-relative path against SITE_ORIGIN. Absolute URLs pass through
 * untouched, so a page can point og:image at an uploaded cover image on
 * Supabase storage without special-casing.
 */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_ORIGIN}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}
