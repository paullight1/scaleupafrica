// =============================================================================
// Email configuration — brand constants + env resolution.
//
// Pure TypeScript (NO Deno globals, NO npm: imports) so it runs on the Deno edge
// runtime AND under Vitest (Node). Callers pass `Deno.env.toObject()`-shaped
// records in; nothing here reads a global.
// =============================================================================

export const BRAND = {
  name: "Cresciva",
  tagline: "One credible profile. Real funding leads. No hype.",
  orange: "#FF7A59",
  orangeDark: "#E44E2E",
  navy: "#1B2A4A",
  navyDark: "#0D1B2E",
  ink: "#1B2A4A",
  inkMuted: "#5B6B85",
  border: "#E4E8F0",
  surface: "#F7F8FB",
  white: "#FFFFFF",
} as const;

export interface EmailConfig {
  /** Resend API key. Empty string means "email is not configured". */
  apiKey: string;
  /** RFC-5322 From, e.g. `Cresciva <hello@cresciva.com>`. */
  from: string;
  /** Where replies land. */
  replyTo: string;
  /** Internal inbox that receives contact-form notifications. */
  teamInbox: string;
  /** Public site origin, used to build links. No trailing slash. */
  siteUrl: string;
  /** HMAC secret for unsubscribe tokens. Empty string disables one-click unsubscribe. */
  tokenSecret: string;
}

const DEFAULTS = {
  from: "Cresciva <hello@cresciva.com>",
  replyTo: "hello@cresciva.com",
  teamInbox: "hello@cresciva.com",
  // Must match the repository's canonical public-origin contract unless an
  // explicit SITE_URL is supplied by the deployment environment.
  siteUrl: "https://cresciva.vercel.app",
} as const;

function str(source: Record<string, string | undefined>, key: string, fallback = ""): string {
  const raw = source[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : fallback;
}

/**
 * Build the config from an env-shaped record. Never throws — a missing API key
 * yields `apiKey: ""` so callers can degrade gracefully instead of 500-ing a
 * user-facing form.
 */
export function loadEmailConfig(source: Record<string, string | undefined>): EmailConfig {
  return {
    apiKey: str(source, "RESEND_API_KEY"),
    from: str(source, "EMAIL_FROM", DEFAULTS.from),
    replyTo: str(source, "EMAIL_REPLY_TO", DEFAULTS.replyTo),
    teamInbox: str(source, "EMAIL_TEAM_INBOX", DEFAULTS.teamInbox),
    siteUrl: str(source, "SITE_URL", DEFAULTS.siteUrl).replace(/\/+$/, ""),
    tokenSecret: str(source, "EMAIL_TOKEN_SECRET"),
  };
}

/** `Cresciva <hello@cresciva.com>` -> `hello@cresciva.com`. Passthrough otherwise. */
export function bareAddress(address: string): string {
  const match = /<([^>]+)>/.exec(address);
  return (match ? match[1] : address).trim().toLowerCase();
}

/**
 * Conservative address validation. Deliberately stricter than RFC 5322: we only
 * ever send to addresses a human typed into a form, and anything exotic is far
 * more likely to be an injection attempt than a real inbox.
 */
const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;

export function isEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value.trim());
}

/** Normalized (trimmed + lowercased) address, or null when invalid. */
export function normalizeEmail(value: unknown): string | null {
  if (!isEmail(value)) return null;
  return value.trim().toLowerCase();
}
