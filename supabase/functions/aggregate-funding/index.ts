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

    // Verify signed-in user & subscription
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

    const system = `You are a funding intelligence analyst for African SMEs. Return ONLY valid JSON matching the schema. Curate 6-10 REAL, currently-relevant funding opportunities (grants, competitions, accelerators, pitch events, development finance) accessible to African SMEs. Prefer opportunities from Tony Elumelu Foundation, African Development Bank, GIZ, USADF, AECF, World Bank, Mastercard Foundation, Google for Startups Africa, and similar credible funders. If you cannot recall specific current opportunities, describe realistic representative programs from these funders and set the URL to the funder's main site. Never invent fictional funders.`;

    const userPrompt = `Keywords: "${keywords}"\n\nReturn a JSON object with an "opportunities" array. Each item: { "title", "funder", "summary" (2 sentences), "amount" (e.g. "Up to $50,000" or ""), "deadline" (e.g. "Rolling" or "March 2026" or ""), "eligibility" (short), "url" (funder homepage or program URL), "tags" (array of 2-4 short tags) }.`;

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
