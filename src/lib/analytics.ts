import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEventType =
  | "page_view"
  | "funding_search"
  | "resource_view"
  | "resource_download"
  | "blog_view"
  | "signup"
  | "profile_create"
  | "newsletter_signup"
  | "lead_submit";

/** Anonymous, per-browser session id used to group events. */
function getSessionId(): string {
  try {
    const key = "sua_session_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "no-session";
  }
}

/**
 * Fire-and-forget product analytics. Never throws and never blocks the UI —
 * a failed insert (e.g. offline) is silently ignored. RLS allows anon INSERT
 * only; reads are admin-only.
 */
export async function trackEvent(
  eventType: AnalyticsEventType,
  opts: {
    path?: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
      event_type: eventType,
      path: opts.path ?? (typeof window !== "undefined" ? window.location.pathname : null),
      entity_type: opts.entityType ?? null,
      entity_id: opts.entityId ?? null,
      user_id: data.user?.id ?? null,
      session_id: getSessionId(),
      metadata: (opts.metadata ?? {}) as never,
    });
  } catch {
    /* analytics must never break the app */
  }
}

/** Convenience wrapper for page views. */
export function trackPageView(path?: string, metadata?: Record<string, unknown>) {
  void trackEvent("page_view", { path, metadata });
}

/** URL-safe slug from a title. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
