// =============================================================================
// Resend transport — the ONLY place that talks to api.resend.com.
//
// Pure TypeScript (fetch + AbortController only, no Deno globals, no npm:
// imports) so the retry/idempotency logic is unit-testable under Vitest with a
// stubbed fetch. See Frontend/src/lib/__tests__/email-resend.test.ts.
//
// Invariants:
//  - The API key is passed in as an argument and NEVER logged, echoed, or put in
//    an error message. `redact()` guards the one place a response body is logged.
//  - Retries only on 429 / 5xx / network error, with exponential backoff. 4xx
//    other than 429 is a permanent caller error — retrying just burns quota.
//  - Every send may carry an Idempotency-Key so a retried webhook or a double
//    form submit cannot produce two identical emails (Resend dedupes for 24h).
// =============================================================================

export const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface SendEmailInput {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string | string[];
  /** Extra RFC-5322 headers, e.g. List-Unsubscribe. */
  headers?: Record<string, string>;
  /** Resend tags — keys/values are restricted to [A-Za-z0-9_-] and sanitised here. */
  tags?: Record<string, string>;
  /**
   * Max 256 chars, 24h window. Same key + same payload = one delivered email.
   * Always pass one for anything a webhook or a retry could trigger twice.
   */
  idempotencyKey?: string;
}

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string; status: number; retryable: boolean };

export interface SendOptions {
  /** Injectable for tests. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Injectable for tests so backoff doesn't actually sleep. */
  sleepImpl?: (ms: number) => Promise<void>;
  /** Total attempts, including the first. Default 3. */
  maxAttempts?: number;
  /** Per-attempt timeout. Default 10s — an edge function has a hard wall-clock budget. */
  timeoutMs?: number;
}

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 10_000;
const BASE_BACKOFF_MS = 400;

const TAG_RE = /[^A-Za-z0-9_-]/g;

function sanitizeTags(tags?: Record<string, string>): Array<{ name: string; value: string }> | undefined {
  if (!tags) return undefined;
  const out = Object.entries(tags)
    .map(([name, value]) => ({
      name: String(name).replace(TAG_RE, "_").slice(0, 256),
      value: String(value).replace(TAG_RE, "_").slice(0, 256),
    }))
    .filter((t) => t.name && t.value);
  return out.length ? out : undefined;
}

/**
 * Strip anything that looks like a Resend key from a string before it is logged.
 * Defence in depth: the key should never reach here, but a provider echoing a
 * request header back in an error body must not leak it into function logs.
 */
export function redact(value: unknown): string {
  return String(value ?? "").replace(/re_[A-Za-z0-9_-]{8,}/g, "re_***");
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 408 || (status >= 500 && status <= 599);
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * POST one email to Resend, retrying transient failures.
 *
 * Never throws — callers get a discriminated result so a failed send degrades the
 * user-facing flow (the lead is still captured) instead of 500-ing it.
 */
export async function sendEmail(
  apiKey: string,
  input: SendEmailInput,
  options: SendOptions = {},
): Promise<SendResult> {
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not configured", status: 0, retryable: false };
  }

  const doFetch = options.fetchImpl ?? fetch;
  const sleep = options.sleepImpl ?? defaultSleep;
  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_ATTEMPTS);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const body: Record<string, unknown> = {
    from: input.from,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
  };
  if (input.replyTo) body.reply_to = input.replyTo;
  if (input.headers && Object.keys(input.headers).length) body.headers = input.headers;
  const tags = sanitizeTags(input.tags);
  if (tags) body.tags = tags;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (input.idempotencyKey) headers["Idempotency-Key"] = input.idempotencyKey.slice(0, 256);

  const payload = JSON.stringify(body);
  let last: SendResult = { ok: false, error: "no attempt made", status: 0, retryable: false };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await doFetch(RESEND_ENDPOINT, {
        method: "POST",
        headers,
        body: payload,
        signal: controller.signal,
      });

      const raw = await res.text().catch(() => "");
      let parsed: { id?: string; message?: string; name?: string } = {};
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch {
        /* non-JSON body — fall through to the status-based branch */
      }

      if (res.ok && parsed.id) {
        return { ok: true, id: parsed.id };
      }

      const message = redact(parsed.message || parsed.name || raw || res.statusText || "send failed");
      last = { ok: false, error: message, status: res.status, retryable: isRetryableStatus(res.status) };
      if (!last.retryable) return last;
    } catch (e) {
      // Network failure or per-attempt timeout — both worth one more try.
      const message = redact(e instanceof Error ? e.message : e);
      last = { ok: false, error: message, status: 0, retryable: true };
    } finally {
      clearTimeout(timer);
    }

    if (attempt < maxAttempts) await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
  }

  return last;
}
