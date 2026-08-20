// =============================================================================
// Frontend email/capture client — the ONLY way the browser submits a contact
// message, a newsletter signup, or a gated-resource request.
//
// These flows go through the send-email Edge Function, which owns the row write,
// notification, validation, honeypot and abuse throttle. The browser never gets
// to choose an arbitrary resource file URL or bypass server validation.
// =============================================================================
import { supabase } from "@shared/integrations/supabase/client";

export interface CaptureError {
  message: string;
  code?: string;
  /** Per-field messages from the server, keyed by form field name. */
  fields?: Record<string, string>;
}

/**
 * Both branches declare `error` so callers can inspect it without a property-
 * existence failure when this repository is compiled with strictNullChecks off.
 * `ok` remains the discriminant; success can never carry a real error value.
 */
export type CaptureResult<T = Record<string, never>> =
  | ({ ok: true; error?: never } & T)
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
 * Gated resource form → captures the lead and emails the download. The server
 * resolves the file URL from the database and echoes it back only after capture.
 */
export function requestResourceDownload(
  values: ResourceRequest,
): Promise<CaptureResult<{ leadId?: string; fileUrl?: string | null }>> {
  return invoke<{ leadId?: string; fileUrl?: string | null }>({ intent: "resource", ...values });
}
