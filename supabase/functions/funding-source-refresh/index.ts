import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  classifyFundingStatus,
  freshnessWindowMs,
  type FundingStatusSignals,
} from "../../../Shared/src/lib/fundingStatus.ts";
import { safeExternalFetch } from "../_shared/safeExternalFetch.ts";
import {
  extractFundingSourceSignals,
  type ExtractedFundingSignals,
} from "../_shared/fundingSourceSignals.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FUNDING_REFRESH_SECRET = Deno.env.get("FUNDING_REFRESH_SECRET") ?? "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

export const MAX_BATCH = 25;
const DUE_CANDIDATE_SCAN = 100;
const MAX_BODY_BYTES = 8 * 1024;

const APPLICATION_STATUSES = new Set([
  "open",
  "closing_soon",
  "rolling",
  "upcoming",
  "closed",
  "paused",
  "unknown",
]);

type ApplicationStatus =
  | "open"
  | "closing_soon"
  | "rolling"
  | "upcoming"
  | "closed"
  | "paused"
  | "unknown";

type DeadlineStatus = "confirmed" | "rolling" | "unknown";

type FundingRow = {
  id: string;
  source_url: string | null;
  url: string | null;
  verification_status: string | null;
  application_status: string | null;
  status_checked_at: string | null;
  status: string | null;
};

type RefreshInput =
  | { mode: "due"; limit: number }
  | { mode: "opportunity"; opportunityId: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await readJsonBody(req);
  if (!body.ok) return json({ error: body.error }, 400);
  const input = parseInput(body.value);
  if (!input) return json({ error: "invalid_request" }, 400);

  const admin = createClient<any>(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (input.mode === "due") {
    const supplied = req.headers.get("X-Cresciva-Refresh-Secret") ?? "";
    if (!FUNDING_REFRESH_SECRET) return json({ error: "refresh_not_configured" }, 503);
    if (!timingSafeEqual(supplied, FUNDING_REFRESH_SECRET)) {
      return json({ error: "unauthorized" }, 401);
    }
  } else {
    const staff = await requireStaff(req, admin);
    if (!staff.ok) return json({ error: staff.error }, staff.status);
  }

  const targets = input.mode === "due"
    ? await loadDueTargets(admin, input.limit)
    : await loadOpportunityTarget(admin, input.opportunityId);
  if (!targets.ok) return json({ error: "unavailable" }, 500);

  const results: Array<Record<string, unknown>> = [];
  for (const target of targets.rows) {
    results.push(await refreshOpportunity(admin, target));
  }

  return json({
    mode: input.mode,
    checked: results.length,
    results,
  });
});

async function requireStaff(req: Request, admin: any): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const authed = createClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized", status: 401 };

  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "editor", "moderator"])
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("funding-source-refresh: role lookup failed", error.message);
    return { ok: false, error: "unavailable", status: 500 };
  }
  if (!data) return { ok: false, error: "forbidden", status: 403 };
  return { ok: true };
}

async function loadDueTargets(admin: any, limit: number): Promise<{ ok: true; rows: FundingRow[] } | { ok: false }> {
  const { data, error } = await admin
    .from("funding_opportunities")
    .select("id,source_url,url,verification_status,application_status,status_checked_at,status")
    .eq("status", "published")
    .order("status_checked_at", { ascending: true, nullsFirst: true })
    .limit(DUE_CANDIDATE_SCAN);
  if (error) {
    console.error("funding-source-refresh: due query failed", error.message);
    return { ok: false };
  }

  const now = new Date();
  const rows = ((data ?? []) as FundingRow[])
    .filter((row) => authoritativeSource(row) !== null)
    .filter((row) => isDue(row, now))
    .sort((a, b) => duePriority(a) - duePriority(b) || checkedTime(a) - checkedTime(b))
    .slice(0, Math.min(MAX_BATCH, Math.max(1, limit)));
  return { ok: true, rows };
}

async function loadOpportunityTarget(admin: any, opportunityId: string): Promise<{ ok: true; rows: FundingRow[] } | { ok: false }> {
  const { data, error } = await admin
    .from("funding_opportunities")
    .select("id,source_url,url,verification_status,application_status,status_checked_at,status")
    .eq("id", opportunityId)
    .maybeSingle();
  if (error) {
    console.error("funding-source-refresh: opportunity query failed", error.message);
    return { ok: false };
  }
  return { ok: true, rows: data ? [data as FundingRow] : [] };
}

async function refreshOpportunity(admin: any, row: FundingRow): Promise<Record<string, unknown>> {
  const checkedAt = new Date();
  const checkKey = crypto.randomUUID();
  const sourceUrl = authoritativeSource(row);

  if (!sourceUrl) {
    await recordCheck(admin, {
      checkKey,
      opportunityId: row.id,
      sourceUrl: row.url ?? "about:blank",
      checkedAt,
      classifiedStatus: "unknown",
      errorClass: "missing_authoritative_source",
      applyCanonical: false,
    });
    return { opportunityId: row.id, status: "unknown", error: "missing_authoritative_source" };
  }

  const fetched = await safeExternalFetch(sourceUrl, { timeoutMs: 10_000, maxBytes: 2 * 1024 * 1024, maxRedirects: 5 });
  if (!fetched.ok) {
    await recordCheck(admin, {
      checkKey,
      opportunityId: row.id,
      sourceUrl,
      checkedAt,
      httpStatus: fetched.status,
      classifiedStatus: "unknown",
      errorClass: `fetch_${fetched.error}`,
      applyCanonical: false,
    });
    return { opportunityId: row.id, status: "unknown", error: `fetch_${fetched.error}` };
  }

  const fingerprint = await sha256(fetched.body);
  const extracted = await extractFundingSourceSignals({
    sourceUrl: fetched.url,
    sourceText: fetched.body,
    aiApiKey: LOVABLE_API_KEY,
  });
  if (!extracted.ok) {
    await recordCheck(admin, {
      checkKey,
      opportunityId: row.id,
      sourceUrl: fetched.url,
      checkedAt,
      httpStatus: fetched.status,
      contentType: fetched.contentType,
      contentBytes: fetched.bytes,
      fingerprint,
      classifiedStatus: "unknown",
      errorClass: `extract_${extracted.error}`,
      applyCanonical: false,
    });
    return { opportunityId: row.id, status: "unknown", error: `extract_${extracted.error}` };
  }

  const deterministic = toDeterministicSignals(row, extracted.signals, checkedAt);
  const classifiedStatus = classifyFundingStatus(deterministic, checkedAt);
  const deadlineStatus: DeadlineStatus = extracted.signals.rolling_text
    ? "rolling"
    : extracted.signals.deadline_at
      ? "confirmed"
      : "unknown";

  const recorded = await recordCheck(admin, {
    checkKey,
    opportunityId: row.id,
    sourceUrl: fetched.url,
    checkedAt,
    httpStatus: fetched.status,
    contentType: fetched.contentType,
    contentBytes: fetched.bytes,
    fingerprint,
    extractedSignals: extracted.signals,
    classifiedStatus,
    errorClass: null,
    applyCanonical: true,
    statusEvidenceUrl: fetched.url,
    opensAt: extracted.signals.opens_at,
    deadlineAt: extracted.signals.deadline_at,
    deadlineTimezone: extracted.signals.deadline_timezone,
    deadlineStatus,
    currentCycleLabel: extracted.signals.cycle_label,
    applicationUrl: extracted.signals.application_url,
  });

  if (!recorded.ok) {
    return { opportunityId: row.id, status: "unknown", error: "persist_failed" };
  }

  return {
    opportunityId: row.id,
    status: classifiedStatus,
    checkedAt: checkedAt.toISOString(),
    deadlineStatus,
  };
}

function toDeterministicSignals(
  row: FundingRow,
  signals: ExtractedFundingSignals,
  checkedAt: Date,
): FundingStatusSignals {
  const explicitOpen = Boolean(signals.explicit_open_text);
  const explicitClosed = Boolean(signals.explicit_closed_text);
  const explicitPaused = Boolean(signals.explicit_paused_text);
  const explicitRolling = Boolean(signals.rolling_text);
  const applicationCtaActive = Boolean(signals.application_cta_text && signals.application_url);
  const conflict =
    (explicitOpen && explicitClosed) ||
    (explicitOpen && explicitPaused) ||
    (explicitRolling && explicitClosed) ||
    (explicitRolling && explicitPaused);
  const hasCurrentCycleEvidence = Boolean(
    signals.cycle_label ||
    signals.explicit_open_text ||
    signals.explicit_closed_text ||
    signals.explicit_paused_text ||
    signals.rolling_text ||
    signals.application_cta_text ||
    signals.opens_at ||
    signals.deadline_at,
  );

  return {
    sourceVerified: row.verification_status === "verified",
    checkedAt,
    cycleLabel: signals.cycle_label,
    explicitOpen,
    explicitClosed,
    explicitPaused,
    explicitRolling,
    applicationCtaActive,
    opensAt: parseDate(signals.opens_at),
    deadlineAt: parseDate(signals.deadline_at),
    hasCurrentCycleEvidence,
    conflict,
  };
}

function isDue(row: FundingRow, now: Date): boolean {
  const status = normalizeStatus(row.application_status);
  const checked = parseDate(row.status_checked_at);
  if (!checked) return true;
  const age = now.getTime() - checked.getTime();
  return age < 0 || age >= freshnessWindowMs(status);
}

function duePriority(row: FundingRow): number {
  switch (normalizeStatus(row.application_status)) {
    case "closing_soon": return 0;
    case "open": return 1;
    case "upcoming": return 2;
    case "unknown": return 3;
    case "rolling": return 4;
    case "paused": return 5;
    case "closed": return 6;
  }
}

function checkedTime(row: FundingRow): number {
  return parseDate(row.status_checked_at)?.getTime() ?? 0;
}

function normalizeStatus(value: string | null): ApplicationStatus {
  return value && APPLICATION_STATUSES.has(value) ? value as ApplicationStatus : "unknown";
}

function authoritativeSource(row: FundingRow): string | null {
  return validHttpUrl(row.source_url) ?? null;
}

async function recordCheck(admin: any, input: {
  checkKey: string;
  opportunityId: string;
  sourceUrl: string;
  checkedAt: Date;
  httpStatus?: number | null;
  contentType?: string | null;
  contentBytes?: number | null;
  fingerprint?: string | null;
  extractedSignals?: Record<string, unknown> | ExtractedFundingSignals;
  classifiedStatus: ApplicationStatus;
  errorClass?: string | null;
  applyCanonical: boolean;
  statusEvidenceUrl?: string | null;
  opensAt?: string | null;
  deadlineAt?: string | null;
  deadlineTimezone?: string | null;
  deadlineStatus?: DeadlineStatus;
  currentCycleLabel?: string | null;
  applicationUrl?: string | null;
}): Promise<{ ok: true; inserted: boolean } | { ok: false }> {
  const { data, error } = await admin.rpc("record_funding_status_check", {
    _check_key: input.checkKey,
    _opportunity_id: input.opportunityId,
    _source_id: null,
    _source_url: input.sourceUrl,
    _checked_at: input.checkedAt.toISOString(),
    _http_status: input.httpStatus ?? null,
    _content_type: input.contentType ?? null,
    _content_bytes: input.contentBytes ?? null,
    _source_fingerprint: input.fingerprint ?? null,
    _extracted_signals: input.extractedSignals ?? {},
    _classified_status: input.classifiedStatus,
    _error_class: input.errorClass ?? null,
    _apply_canonical: input.applyCanonical,
    _status_evidence_url: input.statusEvidenceUrl ?? null,
    _opens_at: input.opensAt ?? null,
    _deadline_at: input.deadlineAt ?? null,
    _deadline_timezone: input.deadlineTimezone ?? null,
    _deadline_status: input.deadlineStatus ?? "unknown",
    _current_cycle_label: input.currentCycleLabel ?? null,
    _application_url: input.applicationUrl ?? null,
  });
  if (error) {
    console.error("funding-source-refresh: record_funding_status_check failed", error.message);
    return { ok: false };
  }
  return { ok: true, inserted: Boolean(data) };
}

export function timingSafeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function parseInput(value: unknown): RefreshInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.mode === "due") {
    const allowed = new Set(["mode", "limit"]);
    if (Object.keys(raw).some((key) => !allowed.has(key))) return null;
    const requested = typeof raw.limit === "number" && Number.isInteger(raw.limit) ? raw.limit : MAX_BATCH;
    return { mode: "due", limit: Math.min(MAX_BATCH, Math.max(1, requested)) };
  }
  if (raw.mode === "opportunity") {
    const allowed = new Set(["mode", "opportunityId"]);
    if (Object.keys(raw).some((key) => !allowed.has(key))) return null;
    const opportunityId = typeof raw.opportunityId === "string" ? raw.opportunityId.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(opportunityId)) return null;
    return { mode: "opportunity", opportunityId };
  }
  return null;
}

async function readJsonBody(req: Request): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return { ok: false, error: "request_too_large" };
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, error: "invalid_request" };
  }
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return { ok: false, error: "request_too_large" };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: "invalid_request" };
  }
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
