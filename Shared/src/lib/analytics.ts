import { supabase } from "@shared/integrations/supabase/client";

export const ANALYTICS_EVENT_TYPES = [
  "page_view",
  "funding_search",
  "recommendation_impression",
  "recommendation_open",
  "recommendation_save",
  "recommendation_not_relevant",
  "recommendation_apply_click",
  "application_started",
  "application_submitted",
  "application_won",
  "application_rejected",
  "opportunity_source_click",
  "funding_source_check_success",
  "funding_source_check_failure",
  "funding_status_changed",
  "funding_status_conflict",
  "funding_source_overdue",
  "business_enrichment_started",
  "business_enrichment_result",
  "business_enrichment_failed",
  "business_identity_confirmed",
  "business_identity_rejected",
  "resource_view",
  "resource_download",
  "blog_view",
  "signup",
  "profile_create",
  "newsletter_signup",
  "lead_submit",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

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
 * Fire-and-forget product analytics. Never throws and never blocks the UI.
 * Funding events must use aggregate/identifier metadata only — do not duplicate
 * raw business/search text or fetched third-party source bodies into analytics.
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

export function trackPageView(path?: string, metadata?: Record<string, unknown>) {
  void trackEvent("page_view", { path, metadata });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}