import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  normalizeKeywords,
  parseOpportunities,
  type Opportunity,
} from "../_shared/fundingSchema.ts";
import {
  dedupeFundingSearchResults,
  fundingSearchReasons,
  rankFundingSearch,
  type SearchableFundingOpportunity,
} from "../_shared/fundingSearch.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RATE_LIMIT_PER_HOUR = 3;
const GATEWAY_TIMEOUT_MS = 60_000;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const VERIFIED_RESULT_TARGET = 5;
const VERIFIED_SCAN_LIMIT = 100;

interface CuratedRow {
  title?: unknown;
  funder?: unknown;
  type?: unknown;
  summary?: unknown;
  amount?: unknown;
  opens?: unknown;
  deadline?: unknown;
  eligibility?: unknown;
  url?: unknown;
  tags?: unknown;
  country_focus?: unknown;
  details?: unknown;
  last_verified_at?: unknown;
}

interface RankedCuratedCandidate extends SearchableFundingOpportunity {
  opportunity: Opportunity;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: active, error: rpcErr } = await service.rpc("has_active_subscription", {
      _user_id: user.id,
    });
    if (rpcErr) {
      console.error("has_active_subscription RPC failed", rpcErr);
      return json({ error: "unavailable" }, 500);
    }
    if (!active) return json({ error: "subscription_required" }, 403);

    const body = await req.json().catch(() => ({}));
    const rawKeywords = typeof body.keywords === "string" && body.keywords.trim()
      ? body.keywords.slice(0, 200)
      : "African SMEs";
    const keywordsNormalized = normalizeKeywords(rawKeywords);
    const now = new Date();
    const nowIso = now.toISOString();

    // Existing AI-containing search cache remains the fastest repeat path.
    const { data: cached, error: cacheErr } = await service
      .from("funding_results")
      .select("opportunities, created_at")
      .eq("user_id", user.id)
      .eq("keywords_normalized", keywordsNormalized)
      .gt("expires_at", nowIso)
      .maybeSingle();
    if (cacheErr) {
      console.error("funding cache lookup failed", cacheErr);
      return json({ error: "unavailable" }, 500);
    }
    if (cached) {
      return json({
        opportunities: cached.opportunities,
        cached: true,
        generated_at: cached.created_at,
      });
    }

    // Search Cresciva's curated opportunity intelligence BEFORE consuming AI quota.
    const { data: curatedRows, error: curatedErr } = await service
      .from("funding_opportunities")
      .select(
        "title, funder, type, summary, amount, opens, deadline, eligibility, url, tags, country_focus, details, last_verified_at",
      )
      .eq("status", "published")
      .limit(VERIFIED_SCAN_LIMIT);
    if (curatedErr) {
      console.error("verified funding search failed", curatedErr);
      return json({ error: "unavailable" }, 500);
    }

    const curatedCandidates = (Array.isArray(curatedRows) ? curatedRows : [])
      .map((row) => toCuratedCandidate(row as CuratedRow, rawKeywords, now))
      .filter((candidate): candidate is RankedCuratedCandidate => candidate !== null);

    const verifiedRanked = rankFundingSearch(rawKeywords, curatedCandidates, 12);
    const verifiedOpportunities = verifiedRanked.map((candidate) => candidate.opportunity);

    // Strong verified results are cheap and authoritative enough to return directly.
    // We deliberately do not persist them to funding_results because that table is
    // also the current AI-rate-limit ledger; verified-only searches must not burn AI quota.
    if (verifiedOpportunities.length >= VERIFIED_RESULT_TARGET) {
      return json({
        opportunities: verifiedOpportunities,
        cached: false,
        generated_at: nowIso,
      });
    }

    // AI fallback starts here. A missing gateway key cannot break verified-only search.
    if (!LOVABLE_API_KEY) {
      return json({
        opportunities: verifiedOpportunities,
        cached: false,
        generated_at: nowIso,
      });
    }

    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const { count, error: rateErr } = await service
      .from("funding_results")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gt("created_at", hourAgo);
    if (rateErr) {
      console.error("funding rate-limit lookup failed", rateErr);
      return json({ error: "unavailable" }, 500);
    }
    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      // Even when the AI quota is exhausted, don't hide verified matches already found.
      if (verifiedOpportunities.length > 0) {
        return json({
          opportunities: verifiedOpportunities,
          cached: false,
          generated_at: nowIso,
        });
      }
      return json(
        {
          error: "rate_limited",
          message:
            "You've run several AI-assisted searches recently. Please try again in about an hour — your previous results are saved.",
        },
        429,
      );
    }

    const aiRes = await callGateway(rawKeywords).catch((e) => {
      if (e instanceof DOMException && e.name === "TimeoutError") return "timeout" as const;
      throw e;
    });
    if (aiRes === "timeout") {
      if (verifiedOpportunities.length > 0) {
        return json({ opportunities: verifiedOpportunities, cached: false, generated_at: nowIso });
      }
      return json({ error: "timeout" }, 504);
    }

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errText.slice(0, 500));
      if (verifiedOpportunities.length > 0) {
        return json({ opportunities: verifiedOpportunities, cached: false, generated_at: nowIso });
      }
      if (aiRes.status === 429) {
        return json({ error: "rate_limited", message: "The AI discovery service is busy. Please try again shortly." }, 429);
      }
      return json({ error: "invalid_ai_output" }, 502);
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(content);
    } catch {
      if (verifiedOpportunities.length > 0) {
        return json({ opportunities: verifiedOpportunities, cached: false, generated_at: nowIso });
      }
      return json({ error: "invalid_ai_output" }, 502);
    }

    const rawArray = Array.isArray((parsedRaw as { opportunities?: unknown[] })?.opportunities)
      ? (parsedRaw as { opportunities: unknown[] }).opportunities
      : [];

    let aiOpportunities: Opportunity[];
    try {
      aiOpportunities = parseOpportunities(parsedRaw).map((opportunity) => ({
        ...opportunity,
        discovery_source: "ai_assisted" as const,
        verification_status: "unverified" as const,
        source_checked_at: undefined,
        match_reasons: [],
      }));
    } catch {
      if (verifiedOpportunities.length > 0) {
        return json({ opportunities: verifiedOpportunities, cached: false, generated_at: nowIso });
      }
      return json({ error: "invalid_ai_output" }, 502);
    }

    // A non-empty model response that yields zero structurally valid items is bad;
    // an explicitly empty result is valid and preferable to fabricated padding.
    if (aiOpportunities.length === 0 && rawArray.length > 0) {
      if (verifiedOpportunities.length > 0) {
        return json({ opportunities: verifiedOpportunities, cached: false, generated_at: nowIso });
      }
      return json({ error: "invalid_ai_output" }, 502);
    }

    const opportunities = dedupeFundingSearchResults(
      verifiedOpportunities,
      aiOpportunities,
    ).slice(0, 15);

    await service
      .from("funding_results")
      .delete()
      .eq("user_id", user.id)
      .lt("expires_at", nowIso);

    const { error: cacheWriteErr } = await service.from("funding_results").upsert(
      {
        user_id: user.id,
        keywords_normalized: keywordsNormalized,
        keywords_raw: rawKeywords,
        opportunities,
        expires_at: new Date(now.getTime() + CACHE_TTL_MS).toISOString(),
      },
      { onConflict: "user_id,keywords_normalized" },
    );
    if (cacheWriteErr) {
      // Search results are still useful; log the cost-control degradation without
      // converting a successful provider response into a user-facing failure.
      console.error("funding cache write failed", cacheWriteErr);
    }

    return json({ opportunities, cached: false, generated_at: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    return json({ error: "unavailable" }, 500);
  }
});

function toCuratedCandidate(
  row: CuratedRow,
  query: string,
  now: Date,
): RankedCuratedCandidate | null {
  const details = row.details && typeof row.details === "object" && !Array.isArray(row.details)
    ? row.details as Record<string, unknown>
    : {};
  const lastVerifiedAt = typeof row.last_verified_at === "string" ? row.last_verified_at : null;
  const status = verificationStatus(lastVerifiedAt, now);
  const countryFocus = Array.isArray(row.country_focus)
    ? row.country_focus.map((value) => String(value ?? "").trim()).filter(Boolean)
    : [];

  let opportunity: Opportunity;
  try {
    const [parsed] = parseOpportunities([{
      ...details,
      title: String(row.title ?? ""),
      funder: String(row.funder ?? ""),
      type: row.type == null ? undefined : String(row.type),
      summary: String(row.summary ?? ""),
      amount: String(row.amount ?? ""),
      opens: String(row.opens ?? ""),
      deadline: String(row.deadline ?? ""),
      eligibility: String(row.eligibility ?? ""),
      url: row.url ?? "",
      tags: Array.isArray(row.tags) ? row.tags : [],
      discovery_source: "verified_feed",
      verification_status: status,
      source_checked_at: lastVerifiedAt ?? undefined,
    }]);
    if (!parsed) return null;
    opportunity = parsed;
  } catch {
    return null;
  }

  const searchable: SearchableFundingOpportunity = {
    title: opportunity.title,
    funder: opportunity.funder,
    type: opportunity.type,
    summary: opportunity.summary,
    eligibility: opportunity.eligibility,
    tags: opportunity.tags,
    countryFocus,
    url: opportunity.url,
  };

  opportunity = {
    ...opportunity,
    match_reasons: fundingSearchReasons(query, searchable),
  };

  return { ...searchable, opportunity };
}

function verificationStatus(
  lastVerifiedAt: string | null,
  now: Date,
): "verified" | "stale" | "unverified" {
  if (!lastVerifiedAt) return "unverified";
  const checked = new Date(lastVerifiedAt).getTime();
  if (Number.isNaN(checked)) return "unverified";
  const ageDays = Math.max(0, (now.getTime() - checked) / 86_400_000);
  return ageDays <= 7 ? "verified" : "stale";
}

function callGateway(keywords: string): Promise<Response> {
  const system = `You are an AI-assisted funding discovery analyst for African SMEs. Return ONLY valid JSON matching the requested schema.

CRITICAL RULES:
- Return between 0 and 10 candidate opportunities. ZERO is valid. Prefer fewer plausible candidates over padding.
- NEVER invent a fictional funder, program, amount, URL, deadline, or recipient.
- If you are not confident a program exists, omit it.
- If the CURRENT application deadline is unknown, use an empty string. NEVER substitute a typical or historical closing month for a current deadline.
- Never claim that a result is verified, current, open, or source-checked unless that fact is actually known from your available information.
- Past recipients must be empty unless genuinely known.
- Focus on relevance to the user's query rather than forcing diversity or a minimum number of categories.
- Cresciva will label every result from this call as AI-assisted and unverified until a separate source-verification process confirms it.`;

  const userPrompt = `Search request: "${keywords}"

Return a JSON object with an "opportunities" array containing 0-10 items. Each item may contain:
{
  "title": string,
  "funder": string,
  "type": "Grant" | "Competition" | "Accelerator" | "Incubator" | "Fellowship" | "Scholarship" | "Pitch Event" | "Development Finance",
  "summary": string,
  "amount": string (empty if unknown),
  "opens": string (empty if unknown),
  "deadline": string (CURRENT application deadline only; empty if unknown),
  "eligibility": string,
  "url": string (real http/https program or funder URL, empty if unknown),
  "tags": string[],
  "funder_about": string,
  "sdg_focus": string[],
  "past_recipients": [ { "business_name": string, "founder_name": string, "website": string, "note": string } ],
  "application_tips": string[],
  "travel_component": string,
  "important_notes": string
}

Do not add filler to reach a target count. An empty opportunities array is better than uncertain or fabricated records.`;

  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 9000,
    }),
    signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
  });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
