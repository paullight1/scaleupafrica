/**
 * The ONLY builder of a public profile path. Seam with plan 04: once the `slug`
 * column + `/directory/:slug` route land, this prefers the slug; until then it
 * falls back to the id-based path (the route resolves either).
 */
export function publicProfilePath(p: { slug?: string | null; id: string }): string {
  const slug = p.slug?.trim();
  return `/directory/${slug && slug.length > 0 ? slug : p.id}`;
}

/** Absolute URL for sharing (clipboard / WhatsApp / navigator.share). */
export function publicProfileUrl(
  p: { slug?: string | null; id: string },
  origin: string = typeof window !== "undefined" ? window.location.origin : "",
): string {
  return `${origin}${publicProfilePath(p)}`;
}
