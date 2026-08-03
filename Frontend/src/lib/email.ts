// =============================================================================
// Frontend email/capture client — the ONLY way the browser submits a contact
// message, a newsletter signup, or a gated-resource request.
//
// These three flows used to insert into `leads` / `newsletter_subscribers`
// straight from the browser. They now go through the `send-email` edge function,
// which owns the row write AND the notification. That means:
//   - the team is always told about a lead that was captured (one code path),
//   - the file URL for a gated download is resolved server-side from the DB
//     rather than trusted from the client,
//   - validation, honeypot and per-IP throttling happen somewhere a visitor
//     cannot bypass by opening devtools.
//
// Supabase wraps a non-2xx as FunctionsHttpError whose `.context` is the raw
// Response, so `readError` digs the typed body out of it — same shape as
// lib/paystack.ts.
// =============================================================================
import { supabase } from "@shared/integrations/supabase/client";

export interface CaptureError {
  message: string;
  code?: string;
  /** Per-field messages from the server, keyed by form field name. */
  fields?: Record<string, string>;
}

export type CaptureResult<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: CaptureError };

interface ServerError {
  error?: string;
  code?: string;
  fields?: Record<string, string>;
}

const GENERIC = "Something went wrong. Please try again.";

async function readError(error: unknown): Promise<CaptureError> {
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = (await ctx.json()) as ServerError;
      return {
        message: body.error || GENERIC,
        code: body.code,
        fields: body.fields,
      };
    } catch {
      /* non-JSON body — fall through */
    }
  }
  const message = error instanceof Error ? error.message : "";
  return { message: message || GENERIC };
}

async function invoke<T>(body: Record<string, unknown>): Promise<CaptureResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean } & T>("send-email", {
      body,
    });
    if (error) return { ok: false, error: await readError(error) };
    return { ok: true, ...((data ?? {}) as T) };
  } catch (e) {
    // Network-level failure (offline, DNS, CORS) — invoke() throws rather than
    // returning an error, so the caller still gets a typed result either way.
    return { ok: false, error: await readError(e) };
  }
}

export interface ContactSubmission {
  name: string;
  email: string;
  company?: string;
  message: string;
  /** Honeypot. Must stay empty; a filled value means a bot filled the hidden field. */
  hp?: string;
}

/** Contact form → captures the lead, acknowledges the sender, notifies the team. */
export function submitContact(values: ContactSubmission): Promise<CaptureResult<{ leadId?: string }>> {
  return invoke<{ leadId?: string }>({ intent: "contact", ...values });
}

/** Newsletter box → subscribes and sends the welcome email (once per address). */
export function subscribeToNewsletter(
  email: string,
  source = "site",
  hp?: string,
): Promise<CaptureResult> {
  return invoke({ intent: "newsletter", email, source, hp });
}

export interface ResourceRequest {
  email: string;
  name?: string;
  company?: string;
  resourceId: string;
  hp?: string;
}

/**
 * Gated resource form → captures the lead and emails the download.
 * Echoes back the server-resolved `fileUrl` so the page can unlock the download
 * immediately instead of making the visitor wait on their inbox.
 */
export function requestResourceDownload(
  values: ResourceRequest,
): Promise<CaptureResult<{ leadId?: string; fileUrl?: string | null }>> {
  return invoke<{ leadId?: string; fileUrl?: string | null }>({ intent: "resource", ...values });
}
