import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  selectBusinessIdentity,
  type BusinessIdentityInput,
  type ScoredBusinessIdentityCandidate,
} from "../../../Shared/src/lib/businessIdentity.ts";
import {
  discoverBusinessCandidates,
  type EnrichedBusinessCandidate,
} from "../_shared/businessDiscovery.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BRAVE_SEARCH_API_KEY = Deno.env.get("BRAVE_SEARCH_API_KEY") ?? "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const MAX_BODY_BYTES = 16 * 1024;

type ConfirmationInput = {
  runId: string;
  candidateId: string;
  accepted: boolean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const authed = createClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  const bodyResult = await readJsonBody(req);
  if (!bodyResult.ok) return json({ error: bodyResult.error }, 400);
  const admin = createClient<any>(SUPABASE_URL, SERVICE_ROLE_KEY);

  const confirmation = parseConfirmation(bodyResult.value);
  if (confirmation) return handleConfirmation(admin, user.id, confirmation);

  const input = parseInput(bodyResult.value);
  if (!input) return json({ error: "invalid_request" }, 400);

  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const { error: runInsertError } = await admin.from("business_enrichment_runs").insert({
    id: runId,
    user_id: user.id,
    business_name_input: input.businessName,
    website_hint: input.website ?? null,
    country_hint: input.countryHint ?? null,
    status: "pending",
    candidate_count: 0,
    started_at: startedAt,
  });
  if (runInsertError) {
    console.error("business-enrichment: run insert failed", runInsertError.message);
    return json({ error: "unavailable" }, 500);
  }

  try {
    const discovery = await discoverBusinessCandidates({
      businessName: input.businessName,
      website: input.website,
      countryHint: input.countryHint,
      braveApiKey: BRAVE_SEARCH_API_KEY,
      aiApiKey: LOVABLE_API_KEY,
    });

    if (!discovery.ok) {
      await finishRun(admin, runId, "failed", 0, null, discovery.error);
      await auditEvent(admin, user.id, "business_enrichment_failed", {
        run_id: runId,
        error_class: discovery.error,
      });
      return json({
        runId,
        state: "failed",
        candidates: [],
        errorCode: discovery.error,
        error: discovery.error === "provider_unavailable" ? "provider_unavailable" : "business_enrichment_failed",
      }, discovery.error === "provider_unavailable" ? 503 : 502);
    }

    const identityInput: BusinessIdentityInput = {
      businessName: input.businessName,
      website: input.website,
      countryHint: input.countryHint,
    };
    const scoredInput: ScoredBusinessIdentityCandidate[] = discovery.candidates.map((candidate) => ({
      id: candidate.id,
      canonicalName: candidate.canonicalName,
      website: candidate.website,
      country: candidate.country,
      summary: candidate.summary,
      sourceUrls: candidate.sourceUrls,
    }));
    const selection = selectBusinessIdentity(identityInput, scoredInput);
    const scoreById = new Map(selection.ranked.map(({ candidate, score }) => [candidate.id, score]));

    const rows = discovery.candidates.map((candidate) => ({
      id: candidate.id,
      run_id: runId,
      canonical_name: candidate.canonicalName,
      website: candidate.website,
      country: candidate.country,
      summary: candidate.summary,
      identity_confidence: scoreById.get(candidate.id) ?? 0,
      source_urls: candidate.sourceUrls,
      enriched_profile: candidate.enrichedProfile,
      field_evidence: candidate.fieldEvidence,
      member_state: "proposed",
    }));

    if (rows.length) {
      const { error } = await admin.from("business_enrichment_candidates").insert(rows);
      if (error) throw new Error(`candidate_insert:${error.message}`);
    }

    const selected = selection.candidate
      ? discovery.candidates.find((candidate) => candidate.id === selection.candidate?.id) ?? null
      : null;
    await finishRun(
      admin,
      runId,
      selection.state,
      rows.length,
      selected?.id ?? null,
      null,
    );

    await auditEvent(
      admin,
      user.id,
      selection.state === "resolved"
        ? "business_identity_resolved"
        : selection.state === "ambiguous"
          ? "business_identity_ambiguous"
          : "business_enrichment_failed",
      {
        run_id: runId,
        candidate_count: rows.length,
        top_confidence: selection.score,
        margin: selection.margin,
      },
    );

    const candidates = discovery.candidates.map((candidate) =>
      publicCandidate(candidate, scoreById.get(candidate.id) ?? 0)
    );
    return json({
      runId,
      state: selection.state,
      candidates,
      selectedCandidate: selected
        ? publicCandidate(selected, scoreById.get(selected.id) ?? 0)
        : undefined,
    });
  } catch (error) {
    console.error("business-enrichment failed", error instanceof Error ? error.message : error);
    await finishRun(admin, runId, "failed", 0, null, "unavailable");
    await auditEvent(admin, user.id, "business_enrichment_failed", {
      run_id: runId,
      error_class: "unavailable",
    });
    return json({ runId, state: "failed", candidates: [], error: "business_enrichment_failed" }, 500);
  }
});

async function handleConfirmation(admin: any, userId: string, input: ConfirmationInput): Promise<Response> {
  const { data: run, error: runError } = await admin
    .from("business_enrichment_runs")
    .select("id,user_id")
    .eq("id", input.runId)
    .eq("user_id", userId)
    .maybeSingle();
  if (runError) {
    console.error("business-enrichment: confirmation ownership lookup failed", runError.message);
    return json({ error: "unavailable" }, 500);
  }
  if (!run) return json({ error: "not_found" }, 404);

  const { data: candidate, error: candidateError } = await admin
    .from("business_enrichment_candidates")
    .select("id,run_id")
    .eq("id", input.candidateId)
    .eq("run_id", input.runId)
    .maybeSingle();
  if (candidateError) {
    console.error("business-enrichment: candidate lookup failed", candidateError.message);
    return json({ error: "unavailable" }, 500);
  }
  if (!candidate) return json({ error: "not_found" }, 404);

  const { data, error } = await admin.rpc("confirm_business_identity", {
    _run_id: input.runId,
    _candidate_id: input.candidateId,
    _user_id: userId,
    _accepted: input.accepted,
  });
  if (error || !data) {
    console.error("business-enrichment: confirmation RPC failed", error?.message);
    return json({ error: "unavailable" }, 500);
  }

  await auditEvent(
    admin,
    userId,
    input.accepted ? "business_identity_confirmed" : "business_identity_rejected",
    { run_id: input.runId, candidate_id: input.candidateId },
  );
  return json(data, 200);
}

async function finishRun(
  admin: any,
  runId: string,
  status: "resolved" | "ambiguous" | "not_found" | "failed",
  candidateCount: number,
  selectedCandidateId: string | null,
  errorClass: string | null,
) {
  const { error } = await admin
    .from("business_enrichment_runs")
    .update({
      status,
      candidate_count: candidateCount,
      selected_candidate_id: selectedCandidateId,
      error_class: errorClass,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);
  if (error) throw new Error(`run_update:${error.message}`);
}

async function auditEvent(admin: any, userId: string, eventType: string, metadata: Record<string, unknown>) {
  const { error } = await admin.from("analytics_events").insert({
    event_type: eventType,
    user_id: userId,
    entity_type: "business_enrichment_run",
    metadata,
  });
  if (error) console.warn("business-enrichment analytics insert failed", error.message);
}

function publicCandidate(candidate: EnrichedBusinessCandidate, identityConfidence: number) {
  return {
    id: candidate.id,
    canonicalName: candidate.canonicalName,
    website: candidate.website,
    country: candidate.country,
    summary: candidate.summary,
    identityConfidence,
    sourceUrls: candidate.sourceUrls,
    enrichedProfile: candidate.enrichedProfile,
    fieldEvidence: candidate.fieldEvidence,
    memberState: "proposed",
  };
}

function parseConfirmation(value: unknown): ConfirmationInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const keys = Object.keys(raw);
  if (!keys.includes("runId") && !keys.includes("candidateId")) return null;
  const allowed = new Set(["runId", "candidateId", "accepted"]);
  if (keys.some((key) => !allowed.has(key))) return null;
  const runId = uuid(raw.runId);
  const candidateId = uuid(raw.candidateId);
  if (!runId || !candidateId || typeof raw.accepted !== "boolean") return null;
  return { runId, candidateId, accepted: raw.accepted };
}

function parseInput(value: unknown): { businessName: string; website?: string; countryHint?: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const allowed = new Set(["businessName", "website", "countryHint"]);
  if (Object.keys(raw).some((key) => !allowed.has(key))) return null;
  const businessName = text(raw.businessName, 160);
  if (businessName.length < 2) return null;
  const website = optionalText(raw.website, 300);
  const countryHint = optionalText(raw.countryHint, 120);
  return {
    businessName,
    ...(website ? { website } : {}),
    ...(countryHint ? { countryHint } : {}),
  };
}

async function readJsonBody(
  req: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  const length = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return { ok: false, error: "request_too_large" };
  }
  let textBody: string;
  try {
    textBody = await req.text();
  } catch {
    return { ok: false, error: "invalid_request" };
  }
  if (new TextEncoder().encode(textBody).byteLength > MAX_BODY_BYTES) {
    return { ok: false, error: "request_too_large" };
  }
  try {
    return { ok: true, value: JSON.parse(textBody) };
  } catch {
    return { ok: false, error: "invalid_request" };
  }
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalText(value: unknown, max: number): string | undefined {
  const result = text(value, max);
  return result || undefined;
}

function uuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)
    ? normalized
    : null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
