// =============================================================================
// dispatch() — render a template, hand it to Resend, record the outcome.
//
// The single funnel every outbound email goes through. Callers never touch
// sendEmail() or render() directly: doing so would skip the audit row, the
// List-Unsubscribe headers, and the tagging.
//
// Pure TypeScript — the audit sink is injected as a callback so this file stays
// free of npm: imports and remains testable under Vitest. The edge functions
// supply a service-role Supabase writer.
// =============================================================================

import type { EmailConfig } from "./config.ts";
import { bareAddress } from "./config.ts";
import { render, type EmailKind, type EmailPayload } from "./templates.ts";
import { sendEmail, type SendOptions, type SendResult } from "./resend.ts";

export interface Envelope {
  to: string | string[];
  /** Overrides config.replyTo — used by contact_notify so the team can reply to the sender. */
  replyTo?: string;
  /**
   * Resend dedupes identical keys for 24h. REQUIRED for anything a webhook,
   * a browser retry, or a double-submit could trigger twice.
   */
  idempotencyKey?: string;
  /** When set, adds RFC-8058 one-click unsubscribe headers. */
  listUnsubscribeUrl?: string | null;
}

export interface EmailLogRow {
  kind: EmailKind;
  to_email: string;
  subject: string;
  status: "sent" | "failed" | "skipped";
  provider_id: string | null;
  error: string | null;
}

export interface DispatchDeps {
  config: EmailConfig;
  /**
   * Audit sink. Must not throw — dispatch swallows failures anyway, because a
   * logging outage must never turn into a failed customer email.
   */
  log?: (row: EmailLogRow) => Promise<void>;
  sendOptions?: SendOptions;
}

/**
 * Render + send + log. Never throws.
 *
 * Returns the transport result so callers can decide how loudly to fail. Most
 * user-facing flows should IGNORE a failure: the lead is already captured, and
 * telling a founder "your message failed" because our mail provider blipped is
 * strictly worse than a missing acknowledgement.
 */
export async function dispatch(
  payload: EmailPayload,
  envelope: Envelope,
  deps: DispatchDeps,
): Promise<SendResult> {
  const { config } = deps;
  const rendered = render(payload);
  const primary = Array.isArray(envelope.to) ? envelope.to[0] ?? "" : envelope.to;

  const record = async (row: EmailLogRow) => {
    if (!deps.log) return;
    try {
      await deps.log(row);
    } catch (e) {
      console.error("[email] audit write failed", e instanceof Error ? e.message : e);
    }
  };

  if (!config.apiKey) {
    // Not configured (local dev, or the secret was never set). Log it loudly and
    // move on — the calling flow already persisted the user's data.
    console.warn(`[email] RESEND_API_KEY missing — skipped ${payload.kind} to ${primary}`);
    await record({
      kind: payload.kind,
      to_email: primary,
      subject: rendered.subject,
      status: "skipped",
      provider_id: null,
      error: "RESEND_API_KEY not configured",
    });
    return { ok: false, error: "email_not_configured", status: 0, retryable: false };
  }

  const headers: Record<string, string> = {};
  if (envelope.listUnsubscribeUrl) {
    // RFC 8058: the List-Unsubscribe-Post pair is what makes Gmail/Yahoo render
    // a native one-click unsubscribe instead of burying it in the body.
    headers["List-Unsubscribe"] = `<${envelope.listUnsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const result = await sendEmail(
    config.apiKey,
    {
      from: config.from,
      to: envelope.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      replyTo: envelope.replyTo ?? config.replyTo,
      headers,
      tags: { kind: payload.kind },
      idempotencyKey: envelope.idempotencyKey,
    },
    deps.sendOptions,
  );

  if (result.ok) {
    await record({
      kind: payload.kind,
      to_email: bareAddress(primary),
      subject: rendered.subject,
      status: "sent",
      provider_id: result.id,
      error: null,
    });
  } else {
    console.error(`[email] ${payload.kind} to ${primary} failed (${result.status}): ${result.error}`);
    await record({
      kind: payload.kind,
      to_email: bareAddress(primary),
      subject: rendered.subject,
      status: "failed",
      provider_id: null,
      error: result.error.slice(0, 500),
    });
  }

  return result;
}
