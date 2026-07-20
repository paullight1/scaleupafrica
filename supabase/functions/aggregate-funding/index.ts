import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizeKeywords, parseOpportunities } from "../_shared/fundingSchema.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RATE_LIMIT_PER_HOUR = 3;
const GATEWAY_TIMEOUT_MS = 60_000;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) return json({ error: "unavailable" }, 500);

    // JWT-scoped client: identify the caller.
    const authHeader = req.headers.get("Authorization") ?? "";
    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    // Service-role client: canonical subscription RPC + cache + rate limit.
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // (2) Subscription check via the single server-side rule.
    const { data: active, error: rpcErr } = await service.rpc("has_active_subscription", {
      _user_id: user.id,
    });
    if (rpcErr) {
      console.error("has_active_subscription RPC failed", rpcErr);
      return json({ error: "unavailable" }, 500);
    }
    if (!active) return json({ error: "subscription_required" }, 403);

    // (3) Normalize keywords for the cache key.
    const body = await req.json().catch(() => ({}));
    const rawKeywords = typeof body.keywords === "string" && body.keywords.trim()
      ? body.keywords.slice(0, 200)
      : "African SMEs";
    const keywordsNormalized = normalizeKeywords(rawKeywords);

    // (4) Cache hit ⇒ return immediately, no model call, no bill.
    const nowIso = new Date().toISOString();
    const { data: cached } = await service
      .from("funding_results")
      .select("opportunities, created_at")
      .eq("user_id", user.id)
      .eq("keywords_normalized", keywordsNormalized)
      .gt("expires_at", nowIso)
      .maybeSingle();
    if (cached) {
      return json({
        opportunities: cached.opportunities,
        cached: true,
        generated_at: cached.created_at,
      });
    }

    // (5) Rate limit — cache hits above never reach this, so repeats are always free.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await service
      .from("funding_results")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gt("created_at", hourAgo);
    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return json(
        {
          error: "rate_limited",
          message:
            "You've run several searches recently. Please try again in about an hour — your previous results are saved.",
        },
        429,
      );
    }

    // (6) Gateway call with a hard server-side timeout.
    const aiRes = await callGateway(rawKeywords).catch((e) => {
      if (e instanceof DOMException && e.name === "TimeoutError") return "timeout" as const;
      throw e;
    });
    if (aiRes === "timeout") return json({ error: "timeout" }, 504);

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errText);
      if (aiRes.status === 429) return json({ error: "rate_limited", message: "The AI service is busy. Please try again shortly." }, 429);
      return json({ error: "invalid_ai_output" }, 502);
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(content);
    } catch {
      return json({ error: "invalid_ai_output" }, 502);
    }

    // (7) Validate + sanitize — never trust or persist raw model output.
    const rawArray = Array.isArray((parsedRaw as { opportunities?: unknown[] })?.opportunities)
      ? (parsedRaw as { opportunities: unknown[] }).opportunities
      : [];
    let opportunities;
    try {
      opportunities = parseOpportunities(parsedRaw);
    } catch {
      return json({ error: "invalid_ai_output" }, 502);
    }
    // A non-empty model response that yields zero valid items is a bad response.
    if (opportunities.length === 0 && rawArray.length > 0) {
      return json({ error: "invalid_ai_output" }, 502);
    }

    // (8) Opportunistic cleanup + cache upsert.
    await service.from("funding_results").delete().eq("user_id", user.id).lt("expires_at", nowIso);
    await service.from("funding_results").upsert(
      {
        user_id: user.id,
        keywords_normalized: keywordsNormalized,
        keywords_raw: rawKeywords,
        opportunities,
        expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
      },
      { onConflict: "user_id,keywords_normalized" },
    );

    // (9)
    return json({ opportunities, cached: false, generated_at: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    return json({ error: "unavailable" }, 500);
  }
});

function callGateway(keywords: string): Promise<Response> {
  const system = `You are a funding intelligence analyst for African SMEs. Return ONLY valid JSON matching the schema.

CRITICAL RULES:
- Curate 15-25 REAL, verifiable funding opportunities (grants, competitions, accelerators, incubators, pitch events, development finance, scholarships, and FELLOWSHIPS with travel/exchange opportunities) accessible to African SMEs, founders, and young leaders.
- NEVER invent fictional funders, programs, URLs, or founder examples. If you are not confident a program exists and is genuine, DO NOT include it.
- Cast a WIDE net across credible funders and programs. Consider (non-exhaustive): Tony Elumelu Foundation, African Development Bank, GIZ, USADF, AECF, World Bank, IFC, Mastercard Foundation (incl. EleV, Africa Growth Fund), Google for Startups Africa / Black Founders Fund, Mandela Washington Fellowship (YALI), Obama Foundation Leaders Africa, Chevening, Commonwealth Scholarships, Acumen Fellowship, Anzisha Prize, Jack Ma Foundation Africa Netpreneur Prize, Ashoka, Echoing Green, Cartier Women's Initiative, One Young World, Orange Corners (Netherlands MFA), Westerwelle Young Founders Programme, Seedstars, MEST Africa, Founders Factory Africa, Norrsken Impact Accelerator, Village Capital, Injini, GreenTec Capital, Katapult Africa, FATE Foundation, LEAP Africa, She Leads Africa / SLA, Rising Tide Africa, AWIEF, Africa Enterprise Challenge Fund, DOEN Foundation, Segal Family Foundation, Draper Richards Kaplan, Skoll, Schwab Foundation, WEF Global Shapers, Commonwealth Youth Awards, UNLEASH, Global Citizen Year, MIT Solve, Hult Prize, Milken-Motsepe Prize, Africa's Business Heroes (Jack Ma), Total Startupper, Standard Bank / MTN / Access Bank programs, Shell LiveWIRE, IBM Sustainability Accelerator, Bloomberg Philanthropies, Rockefeller, Ford Foundation, Bill & Melinda Gates Foundation, DFC, FMO, Proparco, British International Investment, EU Delegation SME facilities, AfCFTA-related programs, and similar credible funders.
- Include at least 3-5 FELLOWSHIP opportunities that offer travel, exchange, or residency components.
- For each opportunity provide RICH detail so the founder can decide before visiting the funder site.
- Prioritize breadth and diversity of funder types and geographies over repeating the same 2-3 funders.`;

  const userPrompt = `Keywords: "${keywords}"

Return a JSON object with an "opportunities" array. Each item MUST have:
{
  "title": string,
  "funder": string,
  "type": "Grant" | "Competition" | "Accelerator" | "Incubator" | "Fellowship" | "Scholarship" | "Pitch Event" | "Development Finance",
  "summary": string (2 sentences overview),
  "amount": string (e.g. "Up to $50,000" or "" if unknown),
  "opens": string (when applications open),
  "deadline": string (APPLICATION DEADLINE — the last day to apply. Required. If unknown for the current cycle, give the typical closing month.),
  "eligibility": string (short),
  "url": string (funder homepage or program URL — must be a real https domain),
  "tags": string[] (2-4 short tags),
  "funder_about": string (2-3 sentences about the funding organization),
  "sdg_focus": string[] (relevant UN SDGs),
  "past_recipients": [ { "business_name": string, "founder_name": string, "website": string (or ""), "note": string } ] (2-4 examples if genuinely known, otherwise empty array — do NOT fabricate),
  "application_tips": string[] (3-5 concrete tips),
  "travel_component": string (describe travel/exchange/residency if fellowship, otherwise ""),
  "important_notes": string (caveats or things to know)
}

Return AT LEAST 15 opportunities spanning different funder types. If you cannot recall genuine past recipients, return an empty array for past_recipients — never invent names.`;

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
      max_tokens: 16000,
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
