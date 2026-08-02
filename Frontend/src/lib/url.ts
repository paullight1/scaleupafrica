/**
 * URL & contact-link helpers (Plan 04; also consumed by Plan 05 AI-output validation).
 * All user/AI-supplied URLs pass through `sanitizeUrl` — never render a raw href.
 */

/**
 * Normalize and validate a web address.
 * - Prepends `https://` when the value has no scheme (`example.com` → `https://example.com/`).
 * - Rejects anything that isn't `http:`/`https:` (blocks `javascript:`, `data:`, `ftp:`, …).
 * Returns the normalized absolute URL, or `null` when invalid.
 */
export function sanitizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // A scheme is letters/digits/+/-/. followed by ':'. If present, respect it (and reject
  // non-http(s) below). If absent, assume https.
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return url.toString();
}

/**
 * Map a social handle (or full URL) to a canonical profile URL.
 * Strips a leading `@` and slashes; passes through existing http(s) URLs via `sanitizeUrl`.
 */
export function socialUrl(
  platform: "instagram" | "twitter",
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return sanitizeUrl(v);
  const handle = v.replace(/^@+/, "").replace(/^\/+/, "").trim();
  if (!handle) return null;
  return platform === "instagram"
    ? `https://instagram.com/${handle}`
    : `https://x.com/${handle}`;
}

/**
 * Build a `wa.me` deep link from a phone number (digits only), with optional prefilled text.
 * Returns `null` when no digits are present.
 */
export function waLink(phone: string | null | undefined, text?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
