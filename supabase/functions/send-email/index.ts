// =============================================================================
// send-email — the single public entry point for visitor-triggered email.
//
// POST, NO JWT (verify_jwt=false in supabase/config.toml): the contact form, the
// newsletter box and the gated-resource form are all used by signed-out
// visitors. That makes this function internet-facing and unauthenticated, so it
// owns its own defences:
//
//   - Strict server-side validation of every field; nothing is trusted.
//   - A honeypot field that silently absorbs the cheap bots.
//   - Per-IP throttling against public.email_events (hashed IP, never raw).
//   - Recipients are NEVER caller-controlled beyond the one address being
//     confirmed. There is no "send to whoever you like" shape here.
//
// It also OWNS the row write. The browser used to insert into `leads` /
// `newsletter_subscribers` directly; routing both through this function makes
// capture-and-notify a single atomic-ish step, so we can never end up with a
// lead nobody was told about.
//
// A failed SEND is not a failed SUBMIT: once the row is persisted the caller
// gets 200 even if Resend is down. The person's message is safe; the
// acknowledgement is best-effort and the failure is recorded in email_events.
// =============================================================================
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { loadEmailConfig, normalizeEmail } from "../_shared/email/config.ts";
import { dispatch, type EmailLogRow } from "../_shared/email/dispatch.ts";
import { unsubscribeUrl } from "../_shared/email/tokens.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CONFIG = loadEmailConfig(Deno.env.toObject());
const FUNCTIONS_BASE = `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1`;

type LooseSupabaseClient = SupabaseClient<any, "public", "public", any, any>;

/** Salt for the IP hash. Falls back to the service key so it is never unsalted. */
const IP_SALT = CONFIG.tokenSecret || SERVICE_ROLE_KEY;

const RATE_LIMIT_PER_HOUR = 10;

const MAX = { name: 120, email: 254, company: 160, message: 2000, source: 60 } as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient<any>(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Assigned before any dispatch; the audit row carries it so the throttle can
  // count this caller's sends on the next request.
  let ipHash: string | null = null;
  const log = async (row: EmailLogRow) => {
    await admin.from("email_events").insert({ ...row, ip_hash: ipHash });
  };

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request body." }, 400);

    // Honeypot: a real browser leaves this empty because it is visually hidden
    // and aria-hidden. Answer 200 so the bot learns nothing from the response.
    if (typeof body.hp === "string" && body.hp.trim()) {
      return json({ ok: true }, 200);
    }

    ipHash = await hashIp(clientIp(req));

    const throttled = await isThrottled(admin, ipHash);
    if (throttled) {
      return json({ error: "Too many requests. Please try again later.", code: "RATE_LIMITED" }, 429);
    }

    switch (body.intent) {
      case "contact":
        return await handleContact(admin, body, log);
      case "newsletter":
        return await handleNewsletter(admin, body, log);
      case "resource":
        return await handleResource(admin, body, log);
      default:
        return json({ error: "Unknown intent." }, 400);
    }
  } catch (e) {
    console.error("send-email error", e instanceof Error ? e.message : e);
    return json({ error: "Unexpected error. Please try again.", code: "UNEXPECTED" }, 500);
  }
});

// --- intents -----------------------------------------------------------------

async function handleContact(
  admin: LooseSupabaseClient,
  body: Record<string, unknown>,
  log: (row: EmailLogRow) => Promise<void>,
) {
  const name = str(body.name, MAX.name);
  const email = normalizeEmail(body.email);
  const company = str(body.company, MAX.company);
  const message = str(body.message, MAX.message);

  const fields: Record<string, string> = {};
  if (name.length < 2) fields.name = "Please tell us your name.";
  if (!email) fields.email = "Enter a valid email address.";
  if (message.length < 10) fields.message = "Please add a little more detail.";
  if (Object.keys(fields).length) return json({ error: "Please check the form.", fields }, 400);

  const { data: lead, error } = await admin
    .from("leads")
    .insert({
      name,
      email,
      company: company || null,
      message,
      source: "contact",
      metadata: {},
    })
    .select("id")
    .single();

  // The row is the thing that must not be lost — fail loudly if it did not land.
  if (error || !lead) {
    console.error("send-email: lead insert failed", error?.message);
    return json({ error: "Could not send your message. Please try again.", code: "SAVE_FAILED" }, 500);
  }

  const deps = { config: CONFIG, log };

  // Acknowledgement to the sender, then the internal notification. Sequential on
  // purpose: the ack is the one the human is waiting on.
  await dispatch(
    { kind: "contact_ack", name, message, siteUrl: CONFIG.siteUrl },
    { to: email!, idempotencyKey: `contact-ack:${lead.id}` },
    deps,
  );

  await dispatch(
    {
      kind: "contact_notify",
      name,
      email: email!,
      company,
      message,
      leadId: lead.id,
      siteUrl: CONFIG.siteUrl,
    },
    {
      to: CONFIG.teamInbox,
      replyTo: email!,
      idempotencyKey: `contact-notify:${lead.id}`,
    },
    deps,
  );

  return json({ ok: true, leadId: lead.id }, 200);
}

async function handleNewsletter(
  admin: LooseSupabaseClient,
  body: Record<string, unknown>,
  log: (row: EmailLogRow) => Promise<void>,
) {
  const email = normalizeEmail(body.email);
  if (!email) return json({ error: "Enter a valid email address.", fields: { email: "Enter a valid email address." } }, 400);
  const source = str(body.source, MAX.source) || "site";

  const { data: existing } = await admin
    .from("newsletter_subscribers")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  const alreadySubscribed = existing?.status === "subscribed";

  if (!existing) {
    const { error } = await admin
      .from("newsletter_subscribers")
      .insert({ email, source, status: "subscribed" });
    if (error && !/duplicate key/i.test(error.message)) {
      console.error("send-email: subscriber insert failed", error.message);
      return json({ error: "Could not subscribe. Please try again.", code: "SAVE_FAILED" }, 500);
    }
  } else if (!alreadySubscribed) {
    const { error } = await admin
      .from("newsletter_subscribers")
      .update({ status: "subscribed", source })
      .eq("id", existing.id);
    if (error) {
      console.error("send-email: subscriber resubscribe failed", error.message);
      return json({ error: "Could not subscribe. Please try again.", code: "SAVE_FAILED" }, 500);
    }
  }

  if (!alreadySubscribed) {
    const unsub = await unsubscribeUrl(email, CONFIG.tokenSecret, FUNCTIONS_BASE);
    await dispatch(
      { kind: "newsletter_welcome", email, siteUrl: CONFIG.siteUrl, unsubscribeUrl: unsub },
      { to: email, idempotencyKey: `welcome:${email}`, listUnsubscribeUrl: unsub },
      { config: CONFIG, log },
    );
  }

  return json({ ok: true }, 200);
}

async function handleResource(
  admin: LooseSupabaseClient,
  body: Record<string, unknown>,
  log: (row: EmailLogRow) => Promise<void>,
) {
  const email = normalizeEmail(body.email);
  const name = str(body.name, MAX.name);
  const company = str(body.company, MAX.company);
  const resourceId = str(body.resourceId, 64);

  if (!email) return json({ error: "Enter a valid email address.", fields: { email: "Enter a valid email address." } }, 400);
  if (!resourceId) return json({ error: "Missing resource." }, 400);

  const { data: resource } = await admin
    .from("resources")
    .select("id, title, slug, file_url, status")
    .eq("id", resourceId)
    .eq("status", "published")
    .maybeSingle();

  if (!resource) return json({ error: "Resource not found.", code: "NOT_FOUND" }, 404);

  const { data: lead, error } = await admin
    .from("leads")
    .insert({
      email,
      name: name || null,
      company: company || null,
      source: "resource_download",
      resource_id: resource.id,
      metadata: { resource_title: resource.title },
    })
    .select("id")
    .single();

  if (error || !lead) {
    console.error("send-email: resource lead insert failed", error?.message);
    return json({ error: "Could not submit right now. Please try again.", code: "SAVE_FAILED" }, 500);
  }

  const unsub = await unsubscribeUrl(email, CONFIG.tokenSecret, FUNCTIONS_BASE);
  await dispatch(
    {
      kind: "resource_delivery",
      name,
      resourceTitle: resource.title,
      fileUrl: resource.file_url,
      resourceSlug: resource.slug,
      siteUrl: CONFIG.siteUrl,
      unsubscribeUrl: unsub,
    },
    { to: email, idempotencyKey: `resource:${lead.id}`, listUnsubscribeUrl: unsub },
    { config: CONFIG, log },
  );

  return json({ ok: true, leadId: lead.id, fileUrl: resource.file_url ?? null }, 200);
}

// --- helpers -----------------------------------------------------------------

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return (fwd.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}:${IP_SALT}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function isThrottled(
  admin: LooseSupabaseClient,
  ipHash: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("email_events")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (error) {
    console.error("send-email: throttle check failed", error.message);
    return false;
  }
  return (count ?? 0) >= RATE_LIMIT_PER_HOUR;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
