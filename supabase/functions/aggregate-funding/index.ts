import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return json({ error: "AI gateway not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: sub } = await supabase.from("subscriptions").select("has_access, expires_at").eq("user_id", user.id).maybeSingle();
    const active = !!sub?.has_access && (!sub.expires_at || new Date(sub.expires_at) > new Date());
    if (!active) return json({ error: "Active subscription required" }, 403);

    const body = await req.json().catch(() => ({}));
    const rawKeywords = typeof body.keywords === "string" ? body.keywords : "African SMEs";
    const keywords = rawKeywords.slice(0, 200);

    const system = `You are a funding intelligence analyst for African SMEs. Return ONLY valid JSON matching the schema.

CRITICAL RULES:
- Curate 15-25 REAL, verifiable funding opportunities (grants, competitions, accelerators, incubators, pitch events, development finance, scholarships, and FELLOWSHIPS with travel/exchange opportunities) accessible to African SMEs, founders, and young leaders.
- NEVER invent fictional funders, programs, URLs, or founder examples. If you are not confident a program exists and is genuine, DO NOT include it.
- Cast a WIDE net across credible funders and programs. Consider (non-exhaustive): Tony Elumelu Foundation, African Development Bank, GIZ, USADF, AECF, World Bank, IFC, Mastercard Foundation (incl. EleV, Africa Growth Fund), Google for Startups Africa / Black Founders Fund, Mandela Washington Fellowship (YALI), Obama Foundation Leaders Africa, Chevening, Commonwealth Scholarships, Acumen Fellowship, Anzisha Prize, Jack Ma Foundation Africa Netpreneur Prize, Ashoka, Echoing Green, Cartier Women's Initiative, One Young World, Orange Corners (Netherlands MFA), Westerwelle Young Founders Programme, Seedstars, MEST Africa, Founders Factory Africa, Norrsken Impact Accelerator, Village Capital, Injini, GreenTec Capital, Katapult Africa, FATE Foundation, LEAP Africa, She Leads Africa / SLA, Rising Tide Africa, AWIEF, Africa Enterprise Challenge Fund, DOEN Foundation, Segal Family Foundation, Draper Richards Kaplan, Skoll, Schwab Foundation, WEF Global Shapers, Queen's Young Leaders successors, Commonwealth Youth Awards, UNLEASH, Global Citizen Year, MIT Solve, Hult Prize, Milken-Motsepe Prize, Africa's Business Heroes (Jack Ma), Total Startupper, Standard Bank / MTN / Access Bank programs, Shell LiveWIRE, IBM Sustainability Accelerator, Bloomberg Philanthropies, Rockefeller, Ford Foundation, Bill & Melinda Gates Foundation, DFC, FMO, Proparco, British International Investment, EU Delegation SME facilities, AfCFTA-related programs, and similar credible funders.
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
  "opens": string (when applications open, e.g. "January 2026", "Rolling", "Annual — typically opens Q1"),
  "deadline": string (APPLICATION DEADLINE — the last day to apply, e.g. "31 March 2026", "Annual — closes end of April". Required. If unknown for the current cycle, give the typical closing month.),
  "eligibility": string (short),
  "url": string (funder homepage or program URL — must be a real domain),
  "tags": string[] (2-4 short tags),
  "funder_about": string (2-3 sentences about the funding organization, its mission, founding year if known),
  "sdg_focus": string[] (relevant UN SDGs, e.g. ["SDG 5: Gender Equality", "SDG 8: Decent Work"]),
  "past_recipients": [ { "business_name": string, "founder_name": string, "website": string (or ""), "note": string (1 sentence on what they do) } ] (2-4 examples if genuinely known, otherwise empty array — do NOT fabricate),
  "application_tips": string[] (3-5 concrete tips for a stellar application to THIS funder),
  "travel_component": string (describe travel/exchange/residency if fellowship, otherwise ""),
  "important_notes": string (any caveats, common pitfalls, or things to know)
}

Return AT LEAST 15 opportunities spanning different funder types (grants, fellowships, accelerators, competitions, development finance). Do NOT return fewer than 12 unless the keywords are extremely narrow. If you cannot recall genuine past recipients, return an empty array for past_recipients — never invent names.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errText);
      if (aiRes.status === 429) return json({ error: "Rate limit reached. Try again shortly." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted. Please contact support." }, 402);
      return json({ error: "AI request failed" }, 500);
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: { opportunities?: unknown[] };
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    const opportunities = Array.isArray(parsed.opportunities) ? parsed.opportunities : [];

    return json({ opportunities });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
