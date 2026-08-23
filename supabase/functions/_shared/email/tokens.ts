// =============================================================================
// Unsubscribe tokens — HMAC-SHA256 signed, non-expiring, single-purpose.
//
// Pure TypeScript (Web Crypto + btoa/atob only) so it runs on Deno, in the
// browser, and under Vitest. Unit-tested in Frontend/src/lib/__tests__/email-tokens.test.ts.
//
// Design notes:
//  - Tokens do NOT expire. An unsubscribe link sits in an inbox for years; a
//    token that stops working turns a legal obligation into a support ticket.
//  - The token authorises exactly one action (unsubscribe THIS address) and
//    leaks nothing beyond the address the recipient already knows — their own.
//  - Comparison is timing-safe, reusing the audited Web-Crypto helper shared by
//    the Bachs payment boundary.
// =============================================================================

import { timingSafeEqualHex } from "../bachs.ts";

const PURPOSE = "unsub";

function toBase64Url(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

async function hmacHex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

/**
 * Sign an unsubscribe token for `email`. Returns `<payload>.<sig>` where payload
 * is base64url JSON. Throws if no secret is configured — a silently unsigned
 * token would be forgeable.
 */
export async function signUnsubscribeToken(email: string, secret: string): Promise<string> {
  if (!secret) throw new Error("EMAIL_TOKEN_SECRET is not configured");
  const payload = toBase64Url(JSON.stringify({ p: PURPOSE, e: email.trim().toLowerCase() }));
  const sig = await hmacHex(payload, secret);
  return `${payload}.${sig}`;
}

/**
 * Verify a token and return the address it authorises, or null for anything
 * malformed, tampered with, or signed for a different purpose.
 */
export async function verifyUnsubscribeToken(
  token: string,
  secret: string,
): Promise<string | null> {
  if (!secret || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;

  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let expected: string;
  try {
    expected = await hmacHex(payload, secret);
  } catch {
    return null;
  }
  if (!timingSafeEqualHex(expected, sig.toLowerCase())) return null;

  try {
    const decoded = JSON.parse(fromBase64Url(payload)) as { p?: string; e?: string };
    if (decoded.p !== PURPOSE) return null;
    const email = String(decoded.e ?? "").trim().toLowerCase();
    return email || null;
  } catch {
    return null;
  }
}

/**
 * Build the one-click unsubscribe URL for an address. Returns null when no
 * secret is configured, so templates simply omit the link rather than render a
 * dead one.
 */
export async function unsubscribeUrl(
  email: string,
  secret: string,
  functionsBaseUrl: string,
): Promise<string | null> {
  if (!secret) return null;
  try {
    const token = await signUnsubscribeToken(email, secret);
    return `${functionsBaseUrl.replace(/\/+$/, "")}/email-unsubscribe?token=${encodeURIComponent(token)}`;
  } catch {
    return null;
  }
}
