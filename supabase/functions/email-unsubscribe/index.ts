// =============================================================================
// email-unsubscribe — honours the List-Unsubscribe link in every bulk email.
//
// GET,  NO JWT: the human clicked the footer link. Returns a small HTML page.
// POST, NO JWT: RFC 8058 one-click. Gmail/Yahoo POST here with no body and
//               expect a 200; anything else and they keep showing "report spam"
//               as the easier option, which costs us domain reputation.
//
// Authorisation is the HMAC in the token itself (see _shared/email/tokens.ts) —
// there is no session here, and a token authorises exactly one address.
// Unsubscribing is idempotent: clicking twice is a no-op, not an error.
// =============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadEmailConfig } from "../_shared/email/config.ts";
import { verifyUnsubscribeToken } from "../_shared/email/tokens.ts";
import { BRAND } from "../_shared/email/config.ts";
import { esc } from "../_shared/email/render.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CONFIG = loadEmailConfig(Deno.env.toObject());

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const oneClick = req.method === "POST";

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("", { status: 405 });
  }

  const email = await verifyUnsubscribeToken(token, CONFIG.tokenSecret);
  if (!email) {
    return oneClick
      ? new Response("", { status: 400 })
      : page("That link isn't valid", "The unsubscribe link is malformed or has been altered. Email us and we'll remove you by hand.", false);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { error } = await admin
    .from("newsletter_subscribers")
    .update({ status: "unsubscribed" })
    .eq("email", email);

  if (error) {
    console.error("email-unsubscribe: update failed", error.message);
    return oneClick
      ? new Response("", { status: 500 })
      : page("Something went wrong", "We couldn't process that right now. Please try again in a moment.", false);
  }

  // One-click clients want a bare 200 — no body, no redirect.
  if (oneClick) return new Response("", { status: 200 });

  return page(
    "You're unsubscribed",
    `${email} has been removed from the ${BRAND.name} mailing list. You'll still get transactional email — receipts and replies to messages you send us.`,
    true,
  );
});

function page(title: string, body: string, ok: boolean): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(title)} — ${esc(BRAND.name)}</title>
</head>
<body style="margin:0;font-family:Helvetica,Arial,sans-serif;background:${BRAND.surface};color:${BRAND.ink};">
  <div style="max-width:480px;margin:12vh auto;padding:36px 32px;background:#fff;border:1px solid ${BRAND.border};border-radius:14px;text-align:center;">
    <div style="font-size:19px;font-weight:700;color:${BRAND.navy};margin-bottom:24px;">${esc(BRAND.name)}</div>
    <h1 style="font-size:21px;margin:0 0 12px;">${esc(title)}</h1>
    <p style="margin:0 0 24px;line-height:1.6;color:${BRAND.inkMuted};font-size:15px;">${esc(body)}</p>
    <a href="${esc(CONFIG.siteUrl)}"
       style="display:inline-block;padding:12px 24px;background:${BRAND.orangeDark};color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
      Back to ${esc(BRAND.name)}
    </a>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
