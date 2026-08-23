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

const MAX_METADATA_DEPTH = 3;
const MAX_METADATA_KEYS = 40;
const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_LENGTH = 240;
const BLOCKED_METADATA_KEYS = new Set([
  "raw_query",
  "query_text",
  "search_text",
  "source_text",
  "source_body",
  "raw_body",
  "response_body",
  "page_text",
  "page_content",
  "fetched_content",
  "raw_content",
]);

function normalizeMetadataKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function sanitizeMetadataValue(value: unknown, depth: number): unknown {
  if (depth > MAX_METADATA_DEPTH) return undefined;
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeMetadataValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (!value || typeof value !== "object") return undefined;

  const out: Record<string, unknown> = {};
  let retained = 0;
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (retained >= MAX_METADATA_KEYS) break;
    if (BLOCKED_METADATA_KEYS.has(normalizeMetadataKey(key))) continue;
    const sanitized = sanitizeMetadataValue(raw, depth + 1);
    if (sanitized === undefined) continue;
    out[key.slice(0, 80)] = sanitized;
    retained += 1;
  }
  return out;
}

/**
 * Analytics retains identifiers, statuses, scores, counts and bounded labels only.
 * Raw searches, source bodies, provider responses and page content are discarded.
 */
export function sanitizeAnalyticsMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized = sanitizeMetadataValue(metadata, 0);
  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
    ? sanitized as Record<string, unknown>
    : {};
}

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

/** Fire-and-forget product analytics. Never throws and never blocks the UI. */
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
      metadata: sanitizeAnalyticsMetadata(opts.metadata ?? {}) as never,
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
