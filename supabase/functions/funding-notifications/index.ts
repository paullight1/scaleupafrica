import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isStatusFresh } from "../../../Shared/src/lib/fundingStatus.ts";
import { loadEmailConfig, normalizeEmail } from "../_shared/email/config.ts";
import { dispatch, type EmailLogRow } from "../_shared/email/dispatch.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FUNDING_NOTIFICATION_SECRET = Deno.env.get("FUNDING_NOTIFICATION_SECRET") ?? "";
const CONFIG = loadEmailConfig(Deno.env.toObject());

export const MAX_BATCH = 25;
const MAX_BODY_BYTES = 2 * 1024;
const MAX_ATTEMPTS = 3;
const EVENT_TYPES = new Set(["watchlist_opened", "closing_soon", "deadline_changed"]);
const APPLICATION_STATUSES = new Set(["open", "closing_soon", "rolling", "upcoming", "closed", "paused", "unknown"]);

type FundingEventType = "watchlist_opened" | "closing_soon" | "deadline_changed";
type ApplicationStatus = "open" | "closing_soon" | "rolling" | "upcoming" | "closed" | "paused" | "unknown";

type NotificationEvent = {
  id: string;
  user_id: string;
  opportunity_id: string | null;
  event_type: FundingEventType;
  dedupe_key: string;
  metadata: Record<string, unknown> | null;
  attempt_count: number;
  created_at: string;
};

type OpportunityRow = {
  id: string;
  title: string;
  funder: string;
  status: string | null;
  verification_status: string | null;
  application_status: string | null;
  status_checked_at: string | null;
  application_url: string | null;
  url: string | null;
  deadline_at: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!FUNDING_NOTIFICATION_SECRET) return json({ error: "notification_delivery_not_configured" }, 503);
  const supplied = req.headers.get("X-Cresciva-Notification-Secret") ?? "";
  if (!timingSafeEqual(supplied, FUNDING_NOTIFICATION_SECRET)) return json({ error: "unauthorized" }, 401);

  const requestedLimit = await readLimit(req);
  if (requestedLimit === null) return json({ error: "invalid_request" }, 400);

  const admin = createClient<any>(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: claimed, error: claimError } = await admin.rpc("claim_funding_notification_events", {
    _limit: requestedLimit,
  });
  if (claimError) {
    console.error("funding-notifications: claim failed", claimError.message);
    return json({ error: "unavailable" }, 500);
  }

  const events = (Array.isArray(claimed) ? claimed : []) as NotificationEvent[];
  const summary = { claimed: events.length, sent: 0, suppressed: 0, retried: 0, failed: 0 };

  const log = async (row: EmailLogRow) => {
    const { error } = await admin.from("email_events").insert({ ...row, ip_hash: null });
    if (error) console.warn("funding-notifications: email audit failed", error.message);
  };

  for (const event of events) {
    const result = await deliverEvent(admin, event, log);
    summary[result] += 1;
  }

  return json(summary);
});

async function deliverEvent(
  admin: any,
  event: NotificationEvent,
  log: (row: EmailLogRow) => Promise<void>,
): Promise<"sent" | "suppressed" | "retried" | "failed"> {
  if (!EVENT_TYPES.has(event.event_type) || !event.opportunity_id) {
    await finalize(admin, event.id, "suppressed", "invalid_or_missing_event_target");
    return "suppressed";
  }

  const [stateResult, preferenceResult, opportunityResult] = await Promise.all([
    admin.from("member_opportunity_state")
      .select("state")
      .eq("user_id", event.user_id)
      .eq("opportunity_id", event.opportunity_id)
      .maybeSingle(),
    admin.from("user_preferences")
      .select("email_new_funding,email_new_matches,email_deadline_alerts")
      .eq("user_id", event.user_id)
      .maybeSingle(),
    admin.from("funding_opportunities")
      .select("id,title,funder,status,verification_status,application_status,status_checked_at,application_url,url,deadline_at")
      .eq("id", event.opportunity_id)
      .maybeSingle(),
  ]);

  if (stateResult.error || preferenceResult.error || opportunityResult.error) {
    const message = stateResult.error?.message || preferenceResult.error?.message || opportunityResult.error?.message || "preflight_lookup_failed";
    return await retryOrFail(admin, event, `preflight:${truncate(message)}`);
  }

  const memberState = typeof stateResult.data?.state === "string" ? stateResult.data.state : null;
  if (memberState !== "saved" && memberState !== "preparing") {
    await finalize(admin, event.id, "suppressed", "member_no_longer_watching");
    return "suppressed";
  }

  const prefs = preferenceResult.data ?? {};
  const masterFundingConsent = prefs.email_new_funding !== false;
  if (!masterFundingConsent) {
    await finalize(admin, event.id, "suppressed", "member_funding_email_opted_out");
    return "suppressed";
  }
  const emailNewMatches = (prefs.email_new_matches ?? masterFundingConsent) !== false;
  const emailDeadlineAlerts = (prefs.email_deadline_alerts ?? masterFundingConsent) !== false;
  if (
    (event.event_type === "watchlist_opened" && !emailNewMatches) ||
    (event.event_type !== "watchlist_opened" && !emailDeadlineAlerts)
  ) {
    await finalize(admin, event.id, "suppressed", "member_preference_disabled");
    return "suppressed";
  }

  const opportunity = opportunityResult.data as OpportunityRow | null;
  if (!opportunity || opportunity.status !== "published" || opportunity.verification_status !== "verified") {
    await finalize(admin, event.id, "suppressed", "opportunity_not_currently_verified_and_published");
    return "suppressed";
  }

  const currentStatus = normalizeStatus(opportunity.application_status);
  if (!isStatusFresh(currentStatus, opportunity.status_checked_at, new Date())) {
    await finalize(admin, event.id, "suppressed", "opportunity_status_stale");
    return "suppressed";
  }

  if (!eventStillRelevant(event.event_type, currentStatus, opportunity.deadline_at)) {
    await finalize(admin, event.id, "suppressed", "transition_no_longer_relevant");
    return "suppressed";
  }

  const { data: authResult, error: authError } = await admin.auth.admin.getUserById(event.user_id);
  if (authError) return await retryOrFail(admin, event, `recipient_lookup:${truncate(authError.message)}`);
  const email = normalizeEmail(authResult?.user?.email);
  if (!email) {
    await finalize(admin, event.id, "failed", "recipient_email_missing");
    return "failed";
  }

  const sendResult = await dispatch(
    {
      kind: "funding_alert",
      eventType: event.event_type,
      opportunityTitle: opportunity.title,
      funder: opportunity.funder,
      applicationUrl: opportunity.application_url ?? opportunity.url,
      deadlineAt: opportunity.deadline_at,
      siteUrl: CONFIG.siteUrl,
    },
    {
      to: email,
      idempotencyKey: `funding-alert:${event.id}`,
    },
    { config: CONFIG, log },
  );

  if (sendResult.ok) {
    await finalize(admin, event.id, "sent", null, true);
    return "sent";
  }

  if (sendResult.retryable && event.attempt_count < MAX_ATTEMPTS) {
    await finalize(admin, event.id, "pending", `transport:${truncate(sendResult.error)}`);
    return "retried";
  }

  await finalize(admin, event.id, "failed", `transport:${truncate(sendResult.error)}`);
  return "failed";
}

function eventStillRelevant(eventType: FundingEventType, status: ApplicationStatus, deadlineAt: string | null): boolean {
  if (eventType === "watchlist_opened") {
    return status === "open" || status === "closing_soon" || status === "rolling";
  }
  if (eventType === "closing_soon") return status === "closing_soon";
  if (eventType === "deadline_changed") {
    return Boolean(deadlineAt) && (status === "open" || status === "closing_soon" || status === "rolling" || status === "upcoming");
  }
  return false;
}

async function retryOrFail(admin: any, event: NotificationEvent, error: string): Promise<"retried" | "failed"> {
  if (event.attempt_count < MAX_ATTEMPTS) {
    await finalize(admin, event.id, "pending", error);
    return "retried";
  }
  await finalize(admin, event.id, "failed", error);
  return "failed";
}

async function finalize(
  admin: any,
  eventId: string,
  status: "pending" | "sent" | "failed" | "suppressed",
  lastError: string | null,
  sent = false,
) {
  const patch: Record<string, unknown> = {
    status,
    processing_at: null,
    last_error: lastError,
  };
  if (sent) patch.sent_at = new Date().toISOString();
  const { error } = await admin.from("notification_events").update(patch).eq("id", eventId);
  if (error) console.error("funding-notifications: finalise failed", eventId, error.message);
}

function normalizeStatus(value: unknown): ApplicationStatus {
  const status = typeof value === "string" ? value : "unknown";
  return APPLICATION_STATUSES.has(status) ? status as ApplicationStatus : "unknown";
}

async function readLimit(req: Request): Promise<number | null> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  let text: string;
  try {
    text = await req.text();
  } catch {
    return null;
  }
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return null;
  if (!text.trim()) return MAX_BATCH;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (Object.keys(parsed).some((key) => key !== "limit")) return null;
    const requested = typeof parsed.limit === "number" && Number.isInteger(parsed.limit) ? parsed.limit : MAX_BATCH;
    return Math.min(MAX_BATCH, Math.max(1, requested));
  } catch {
    return null;
  }
}

function truncate(value: unknown): string {
  return String(value ?? "error").replace(/[\r\n\t]+/g, " ").slice(0, 300);
}

export function timingSafeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
