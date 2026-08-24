import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { createBrevoClient } from "../_shared/brevo/client.ts";
import { canDeliverCampaign, contactSyncIntent } from "../_shared/brevo/transitions.ts";
import { validateAudienceFilter } from "../../../AdminPanel/src/lib/newsletter/audience.ts";
import { renderNewsletter } from "../../../AdminPanel/src/lib/newsletter/render.ts";
import type { AudienceFilter, CampaignBlock } from "../../../AdminPanel/src/lib/newsletter/types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")?.trim() ?? "";
const BREVO_LIST_ID = positiveInteger(Deno.env.get("BREVO_LIST_ID"));
const BREVO_SENDER_ID = positiveInteger(Deno.env.get("BREVO_SENDER_ID"));
const PAGE_SIZE = 40;
const MAX_AUDIENCE = 10_000;

type LooseClient = SupabaseClient<any, "public", any>;
type Row = Record<string, any>;

function positiveInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function error(message: string, status = 400, code = "INVALID_REQUEST") {
  return json({ error: message, code }, status);
}

function str(value: unknown, max: number, required = false): string {
  const result = typeof value === "string" ? value.trim().slice(0, max) : "";
  if (required && !result) throw new Error("required_field_missing");
  return result;
}

function email(value: unknown): string | null {
  const result = str(value, 254).toLowerCase();
  return /^[^\s@,;<>\"]+@[^\s@,;<>\"]+\.[^\s@,;<>\"]{2,}$/.test(result) ? result : null;
}

function uuid(value: unknown): string | null {
  const result = str(value, 40);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result) ? result : null;
}

function safeBlock(value: unknown): CampaignBlock | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const block = value as Record<string, unknown>;
  const id = str(block.id, 80) || crypto.randomUUID();
  switch (block.type) {
    case "heading":
      return { id, type: "heading", text: str(block.text, 500), level: block.level === 2 ? 2 : 1 };
    case "paragraph":
      return { id, type: "paragraph", text: str(block.text, 8_000) };
    case "image":
      return { id, type: "image", url: str(block.url, 2_000), alt: str(block.alt, 300), ...(str(block.href, 2_000) ? { href: str(block.href, 2_000) } : {}) };
    case "button":
      return { id, type: "button", label: str(block.label, 160), url: str(block.url, 2_000) };
    case "divider":
      return { id, type: "divider" };
    case "funding":
    case "resource":
      return { id, type: block.type, title: str(block.title, 300), summary: str(block.summary, 1_200), url: str(block.url, 2_000) };
    case "social": {
      const rawLinks = Array.isArray(block.links) ? block.links.slice(0, 12) : [];
      const links = rawLinks.flatMap((link) => {
        if (!link || typeof link !== "object") return [];
        const item = link as Record<string, unknown>;
        const label = str(item.label, 80);
        const url = str(item.url, 2_000);
        return label && url ? [{ label, url }] : [];
      });
      return { id, type: "social", links };
    }
    default:
      return null;
  }
}

function blocks(value: unknown): CampaignBlock[] {
  if (!Array.isArray(value)) throw new Error("invalid_content_blocks");
  const parsed = value.slice(0, 60).map(safeBlock).filter((block): block is CampaignBlock => block !== null);
  if (parsed.length !== value.length) throw new Error("invalid_content_blocks");
  return parsed;
}

function brevo() {
  if (!BREVO_API_KEY || !BREVO_LIST_ID || !BREVO_SENDER_ID) return null;
  return createBrevoClient({ apiKey: BREVO_API_KEY, listId: BREVO_LIST_ID, senderId: BREVO_SENDER_ID });
}

async function requireAdmin(req: Request): Promise<{ user: { id: string; email?: string }; service: LooseClient } | Response> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const scoped = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await scoped.auth.getUser();
  if (authError || !user) return error("Sign in required", 401, "UNAUTHORIZED");

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) as LooseClient;
  const { data: allowed, error: roleError } = await service.rpc("is_admin", { _user_id: user.id });
  if (roleError) {
    console.error("newsletter-admin role check failed", roleError.message);
    return error("Newsletter operations are unavailable", 503, "ROLE_CHECK_FAILED");
  }
  if (!allowed) return error("Administrator access required", 403, "FORBIDDEN");
  return { user, service };
}

async function syncSubscriber(service: LooseClient, subscriber: Row): Promise<{ ok: boolean; message?: string }> {
  const provider = brevo();
  if (!provider) return { ok: false, message: "Brevo is not configured" };
  const intent = contactSyncIntent({ status: subscriber.status, brevo_sync_status: subscriber.brevo_sync_status ?? "pending" });
  const result = intent.operation === "upsert"
    ? await provider.upsertContact({ email: subscriber.email, subscriberId: subscriber.id, subscribed: true })
    : await provider.suppressContact({ email: subscriber.email, subscriberId: subscriber.id });

  if (result.ok) {
    const contactId = result.data && typeof result.data === "object" && "id" in result.data ? result.data.id : null;
    await service.from("newsletter_subscribers").update({
      brevo_contact_id: typeof contactId === "number" ? contactId : subscriber.brevo_contact_id ?? null,
      brevo_sync_status: intent.operation === "suppress" ? "suppressed" : "synced",
      brevo_synced_at: new Date().toISOString(),
      brevo_sync_error: null,
    }).eq("id", subscriber.id);
    await service.from("newsletter_sync_jobs").update({ status: "completed", last_error: null }).eq("subscriber_id", subscriber.id).in("status", ["queued", "running", "failed"]);
    return { ok: true };
  }

  await service.from("newsletter_subscribers").update({
    brevo_sync_status: "failed",
    brevo_sync_error: result.error,
  }).eq("id", subscriber.id);
  await service.from("newsletter_sync_jobs").update({
    status: "failed",
    last_error: result.error,
    next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  }).eq("subscriber_id", subscriber.id).in("status", ["queued", "running", "failed"]);
  return { ok: false, message: result.error };
}

function applyAudience<T>(query: T, audience: AudienceFilter): T {
  let result: any = query;
  if (audience.mode === "segment") {
    if (audience.sources.length) result = result.in("source", audience.sources);
    if (audience.joinedAfter) result = result.gte("subscribed_at", `${audience.joinedAfter}T00:00:00.000Z`);
    if (audience.joinedBefore) result = result.lte("subscribed_at", `${audience.joinedBefore}T23:59:59.999Z`);
  }
  return result as T;
}

async function eligibleSubscribers(service: LooseClient, audience: AudienceFilter): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; from < MAX_AUDIENCE; from += 1_000) {
    let query = service.from("newsletter_subscribers")
      .select("id,email,source,status,subscribed_at,brevo_contact_id,brevo_sync_status")
      .eq("status", "subscribed")
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    query = applyAudience(query, audience);
    const { data, error: queryError } = await query;
    if (queryError) throw new Error("audience_query_failed");
    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (page.length < 1_000) break;
  }
  return rows;
}

async function overview(service: LooseClient) {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [active, unsubscribed, growth, campaigns, events, failedSync] = await Promise.all([
    service.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "subscribed"),
    service.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "unsubscribed"),
    service.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "subscribed").gte("subscribed_at", since),
    service.from("newsletter_campaigns").select("id,internal_name,subject,status,final_recipient_count,scheduled_at,sent_at,created_at").order("created_at", { ascending: false }).limit(5),
    service.from("newsletter_campaign_events").select("event_type").gte("event_at", since),
    service.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("brevo_sync_status", "failed"),
  ]);
  const types = (events.data ?? []).map((row: Row) => row.event_type);
  const count = (type: string) => types.filter((value: string) => value === type).length;
  const delivered = count("delivered");
  return {
    activeSubscribers: active.count ?? 0,
    unsubscribedSubscribers: unsubscribed.count ?? 0,
    newSubscribers30d: growth.count ?? 0,
    delivered30d: delivered,
    clicked30d: count("clicked"),
    unsubscribed30d: count("unsubscribed"),
    deliveryRate: delivered ? delivered / Math.max(delivered + count("hard_bounced"), 1) : 0,
    clickRate: delivered ? count("clicked") / delivered : 0,
    failedSyncCount: failedSync.count ?? 0,
    recentCampaigns: campaigns.data ?? [],
    configured: Boolean(brevo()),
  };
}

async function listSubscribers(service: LooseClient, payload: Row) {
  const page = Math.max(1, positiveInteger(payload.page) || 1);
  const size = Math.min(100, positiveInteger(payload.pageSize) || PAGE_SIZE);
  let query = service.from("newsletter_subscribers").select("*", { count: "exact" });
  const status = str(payload.status, 20);
  const sync = str(payload.sync, 20);
  const source = str(payload.source, 120);
  const search = str(payload.q, 120).replace(/[%_,()]/g, "");
  if (status === "subscribed" || status === "unsubscribed") query = query.eq("status", status);
  if (["pending", "synced", "failed", "suppressed"].includes(sync)) query = query.eq("brevo_sync_status", sync);
  if (source) query = query.eq("source", source);
  if (search) query = query.ilike("email", `%${search}%`);
  if (str(payload.joinedAfter, 10)) query = query.gte("created_at", `${str(payload.joinedAfter, 10)}T00:00:00.000Z`);
  if (str(payload.joinedBefore, 10)) query = query.lte("created_at", `${str(payload.joinedBefore, 10)}T23:59:59.999Z`);
  const from = (page - 1) * size;
  const { data, error: queryError, count } = await query.order("created_at", { ascending: false }).range(from, from + size - 1);
  if (queryError) throw new Error("subscriber_list_failed");
  const { data: sources } = await service.from("newsletter_subscribers").select("source").not("source", "is", null).limit(1_000);
  return { rows: data ?? [], total: count ?? 0, page, pageSize: size, sources: [...new Set((sources ?? []).map((row: Row) => row.source).filter(Boolean))].sort() };
}

async function estimateAudience(service: LooseClient, raw: unknown) {
  const audience = validateAudienceFilter(raw);
  let query = service.from("newsletter_subscribers").select("id,email,source,subscribed_at", { count: "exact" }).eq("status", "subscribed");
  query = applyAudience(query, audience);
  const { data, count, error: queryError } = await query.order("created_at", { ascending: false }).limit(5);
  if (queryError) throw new Error("audience_query_failed");
  return { count: count ?? 0, sample: (data ?? []).map((row: Row) => ({ email: row.email, source: row.source, subscribedAt: row.subscribed_at })) };
}

async function saveCampaign(service: LooseClient, userId: string, payload: Row) {
  const values = payload.values && typeof payload.values === "object" ? payload.values as Row : {};
  const contentBlocks = blocks(values.blocks);
  const audience = validateAudienceFilter(values.audience);
  const subject = str(values.subject, 200, true);
  const senderEmail = email(values.senderEmail);
  const replyTo = email(values.replyTo);
  if (!senderEmail || !replyTo) throw new Error("invalid_sender_email");
  const rendered = renderNewsletter({ subject, previewText: str(values.previewText, 240), blocks: contentBlocks });
  const base = {
    internal_name: str(values.internalName, 160, true),
    subject,
    preview_text: str(values.previewText, 240),
    sender_name: str(values.senderName, 120, true),
    sender_email: senderEmail,
    reply_to: replyTo,
    content_blocks: contentBlocks,
    rendered_html: rendered.html,
    rendered_text: rendered.text,
    audience_filter: audience,
    updated_by: userId,
    last_test_revision: null,
    last_test_status: null,
  };
  const id = uuid(payload.id);
  if (id) {
    const { data: existing, error: loadError } = await service.from("newsletter_campaigns").select("revision,status").eq("id", id).maybeSingle();
    if (loadError || !existing) throw new Error("campaign_not_found");
    if (existing.status !== "draft") throw new Error("campaign_not_editable");
    const { data, error: saveError } = await service.from("newsletter_campaigns").update({ ...base, revision: Number(existing.revision) + 1 }).eq("id", id).select("*").single();
    if (saveError) throw new Error("campaign_save_failed");
    return data;
  }
  const { data, error: saveError } = await service.from("newsletter_campaigns").insert({ ...base, created_by: userId }).select("*").single();
  if (saveError) throw new Error("campaign_save_failed");
  return data;
}

function campaignInput(campaign: Row, audienceListId?: number) {
  return {
    name: campaign.internal_name,
    subject: campaign.subject,
    previewText: campaign.preview_text,
    htmlContent: campaign.rendered_html,
    replyTo: campaign.reply_to,
    senderName: campaign.sender_name,
    ...(audienceListId ? { audienceListId } : {}),
  };
}

async function testCampaign(service: LooseClient, payload: Row) {
  const provider = brevo();
  if (!provider) throw new Error("brevo_not_configured");
  const id = uuid(payload.id);
  const recipient = email(payload.email);
  if (!id || !recipient) throw new Error("invalid_test_request");
  const { data: campaign } = await service.from("newsletter_campaigns").select("*").eq("id", id).maybeSingle();
  if (!campaign || campaign.status !== "draft") throw new Error("campaign_not_editable");

  let providerId = positiveInteger(campaign.brevo_campaign_id);
  const saved = providerId
    ? await provider.updateCampaign(providerId, campaignInput(campaign))
    : await provider.createCampaign(campaignInput(campaign));
  if (!saved.ok) throw new Error(`provider:${saved.error}`);
  if (!providerId && saved.data && typeof saved.data === "object" && "id" in saved.data) providerId = positiveInteger(saved.data.id);
  if (!providerId) throw new Error("provider_campaign_missing");

  const sent = await provider.sendTest(providerId, recipient);
  await service.from("newsletter_campaigns").update({
    brevo_campaign_id: providerId,
    last_test_email: recipient,
    last_test_revision: campaign.revision,
    last_test_status: sent.ok ? "sent" : "failed",
    last_tested_at: new Date().toISOString(),
    provider_error: sent.ok ? null : sent.error,
  }).eq("id", id);
  if (!sent.ok) throw new Error(`provider:${sent.error}`);
  return { sent: true, revision: campaign.revision, email: recipient };
}

async function deliverCampaign(service: LooseClient, payload: Row) {
  const provider = brevo();
  if (!provider) throw new Error("brevo_not_configured");
  const id = uuid(payload.id);
  if (!id) throw new Error("campaign_not_found");
  const { data: campaign } = await service.from("newsletter_campaigns").select("*").eq("id", id).maybeSingle();
  if (!campaign || campaign.status !== "draft") throw new Error("campaign_not_editable");
  if (!canDeliverCampaign(campaign)) throw new Error("current_revision_not_tested");

  const audience = validateAudienceFilter(campaign.audience_filter);
  const candidates = await eligibleSubscribers(service, audience);
  if (!candidates.length) throw new Error("audience_empty");
  if (candidates.length >= MAX_AUDIENCE) throw new Error("audience_too_large");

  const unsynced = candidates.filter((row) => row.brevo_sync_status !== "synced");
  for (let index = 0; index < unsynced.length; index += 10) {
    const results = await Promise.all(unsynced.slice(index, index + 10).map((row) => syncSubscriber(service, row)));
    if (results.some((result) => !result.ok)) throw new Error("audience_sync_required");
  }

  const recipients = candidates.map((row) => ({
    campaign_id: id,
    subscriber_id: row.id,
    email: row.email,
    source: row.source,
    consented_at: row.subscribed_at,
    brevo_contact_id: row.brevo_contact_id,
  }));
  const { error: snapshotError } = await service.from("newsletter_campaign_recipients").upsert(recipients, { onConflict: "campaign_id,email", ignoreDuplicates: true });
  if (snapshotError) throw new Error("audience_snapshot_failed");

  const listName = `Cresciva · ${campaign.internal_name} · ${id.slice(0, 8)}`;
  const audienceList = await provider.createAudienceList(listName, candidates.map((row) => row.email));
  if (!audienceList.ok) throw new Error(`provider:${audienceList.error}`);

  let providerId = positiveInteger(campaign.brevo_campaign_id);
  const scheduledAt = str(payload.scheduledAt, 50) || null;
  if (scheduledAt && (Number.isNaN(Date.parse(scheduledAt)) || Date.parse(scheduledAt) < Date.now() + 60_000)) {
    throw new Error("invalid_schedule");
  }
  const providerPayload = { ...campaignInput(campaign, audienceList.data.id), ...(scheduledAt ? { scheduledAt } : {}) };
  const prepared = providerId
    ? await provider.updateCampaign(providerId, providerPayload)
    : await provider.createCampaign(providerPayload);
  if (!prepared.ok) throw new Error(`provider:${prepared.error}`);
  if (!providerId && prepared.data && typeof prepared.data === "object" && "id" in prepared.data) providerId = positiveInteger(prepared.data.id);
  if (!providerId) throw new Error("provider_campaign_missing");

  const now = new Date().toISOString();
  const nextStatus = scheduledAt ? "scheduled" : "sending";
  const { data: transitioned, error: transitionError } = await service.from("newsletter_campaigns").update({
    status: nextStatus,
    final_recipient_count: candidates.length,
    brevo_campaign_id: providerId,
    brevo_audience_list_id: audienceList.data.id,
    scheduled_at: scheduledAt,
    sending_started_at: scheduledAt ? null : now,
    provider_error: null,
  }).eq("id", id).eq("status", "draft").select("id").maybeSingle();
  if (transitionError || !transitioned) throw new Error("campaign_already_queued");

  if (!scheduledAt) {
    const sent = await provider.sendCampaign(providerId);
    if (!sent.ok) {
      await service.from("newsletter_campaigns").update({ status: "failed", provider_error: sent.error }).eq("id", id);
      throw new Error(`provider:${sent.error}`);
    }
  }
  return { status: nextStatus, recipientCount: candidates.length, scheduledAt, providerCampaignId: providerId };
}

async function handleAction(service: LooseClient, user: { id: string }, action: string, payload: Row) {
  switch (action) {
    case "overview":
      return overview(service);
    case "subscribers.list":
      return listSubscribers(service, payload);
    case "subscriber.consent": {
      const subscriberId = uuid(payload.id);
      if (!subscriberId) throw new Error("subscriber_not_found");
      const { data, error: queryError } = await service.from("newsletter_consent_events").select("*").eq("subscriber_id", subscriberId).order("created_at", { ascending: false }).limit(100);
      if (queryError) throw new Error("consent_history_failed");
      return { rows: data ?? [] };
    }
    case "subscriber.add": {
      const address = email(payload.email);
      if (!address || payload.consentConfirmed !== true) throw new Error("renewed_consent_required");
      const { data: existing } = await service.from("newsletter_subscribers").select("*").eq("email", address).maybeSingle();
      let subscriber: Row;
      if (existing) {
        const { data, error: saveError } = await service.from("newsletter_subscribers").update({
          status: "subscribed", subscribed_at: new Date().toISOString(), unsubscribed_at: null,
          unsubscribe_reason: null, consent_source: "admin", source: existing.source ?? "admin", brevo_sync_status: "pending",
        }).eq("id", existing.id).select("*").single();
        if (saveError) throw new Error("subscriber_save_failed");
        subscriber = data;
      } else {
        const { data, error: saveError } = await service.from("newsletter_subscribers").insert({
          email: address, source: "admin", consent_source: "admin", subscribed_at: new Date().toISOString(), brevo_sync_status: "pending",
        }).select("*").single();
        if (saveError) throw new Error("subscriber_save_failed");
        subscriber = data;
        await service.from("newsletter_consent_events").insert({ subscriber_id: subscriber.id, email: address, event_type: "admin_added", source: "admin", actor_user_id: user.id });
      }
      const synced = await syncSubscriber(service, subscriber);
      return { subscriber, synced: synced.ok, syncError: synced.message ?? null };
    }
    case "subscriber.status": {
      const subscriberId = uuid(payload.id);
      const status = payload.status === "subscribed" ? "subscribed" : payload.status === "unsubscribed" ? "unsubscribed" : null;
      if (!subscriberId || !status || (status === "subscribed" && payload.consentConfirmed !== true)) throw new Error("renewed_consent_required");
      const patch = status === "subscribed"
        ? { status, subscribed_at: new Date().toISOString(), unsubscribed_at: null, unsubscribe_reason: null, consent_source: "admin", brevo_sync_status: "pending" }
        : { status, unsubscribed_at: new Date().toISOString(), unsubscribe_reason: "admin", brevo_sync_status: "pending" };
      const { data: subscriber, error: saveError } = await service.from("newsletter_subscribers").update(patch).eq("id", subscriberId).select("*").single();
      if (saveError) throw new Error("subscriber_save_failed");
      const synced = await syncSubscriber(service, subscriber);
      return { subscriber, synced: synced.ok, syncError: synced.message ?? null };
    }
    case "subscriber.retry": {
      const subscriberId = uuid(payload.id);
      const { data: subscriber } = await service.from("newsletter_subscribers").select("*").eq("id", subscriberId).maybeSingle();
      if (!subscriber) throw new Error("subscriber_not_found");
      return syncSubscriber(service, subscriber);
    }
    case "campaigns.list": {
      let query = service.from("newsletter_campaigns").select("id,internal_name,subject,status,revision,estimated_recipient_count,final_recipient_count,last_test_status,scheduled_at,sent_at,created_at,updated_at");
      const status = str(payload.status, 20);
      const search = str(payload.q, 120).replace(/[%_,()]/g, "");
      if (status && status !== "all") query = query.eq("status", status);
      if (search) query = query.or(`internal_name.ilike.%${search}%,subject.ilike.%${search}%`);
      const { data, error: queryError } = await query.order("created_at", { ascending: false }).limit(200);
      if (queryError) throw new Error("campaign_list_failed");
      return { rows: data ?? [] };
    }
    case "campaign.get": {
      const id = uuid(payload.id);
      const { data, error: queryError } = await service.from("newsletter_campaigns").select("*").eq("id", id).maybeSingle();
      if (queryError || !data) throw new Error("campaign_not_found");
      return data;
    }
    case "campaign.save":
      return saveCampaign(service, user.id, payload);
    case "campaign.duplicate": {
      const id = uuid(payload.id);
      const { data: original } = await service.from("newsletter_campaigns").select("*").eq("id", id).maybeSingle();
      if (!original) throw new Error("campaign_not_found");
      const { data, error: saveError } = await service.from("newsletter_campaigns").insert({
        internal_name: `${original.internal_name} (copy)`.slice(0, 160), subject: original.subject,
        preview_text: original.preview_text, sender_name: original.sender_name, sender_email: original.sender_email,
        reply_to: original.reply_to, content_blocks: original.content_blocks, rendered_html: original.rendered_html,
        rendered_text: original.rendered_text, audience_filter: original.audience_filter, created_by: user.id, updated_by: user.id,
      }).select("*").single();
      if (saveError) throw new Error("campaign_save_failed");
      return data;
    }
    case "audience.estimate":
      return estimateAudience(service, payload.audience);
    case "campaign.test":
      return testCampaign(service, payload);
    case "campaign.deliver":
      return deliverCampaign(service, payload);
    case "campaign.cancel": {
      const id = uuid(payload.id);
      const { data: campaign } = await service.from("newsletter_campaigns").select("*").eq("id", id).maybeSingle();
      if (!campaign || campaign.status !== "scheduled" || !campaign.brevo_campaign_id) throw new Error("campaign_not_cancellable");
      const provider = brevo();
      if (!provider) throw new Error("brevo_not_configured");
      const cancelled = await provider.cancelCampaign(campaign.brevo_campaign_id);
      if (!cancelled.ok) throw new Error(`provider:${cancelled.error}`);
      await service.from("newsletter_campaigns").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", id);
      return { cancelled: true };
    }
    case "campaign.report": {
      const id = uuid(payload.id);
      const { data: campaign } = await service.from("newsletter_campaigns").select("*").eq("id", id).maybeSingle();
      if (!campaign) throw new Error("campaign_not_found");
      const { data: events } = await service.from("newsletter_campaign_events").select("event_type,event_at,recipient_email,clicked_url,reason").eq("campaign_id", id).order("event_at", { ascending: false }).limit(500);
      const counts: Record<string, number> = {};
      for (const event of events ?? []) counts[event.event_type] = (counts[event.event_type] ?? 0) + 1;
      return { campaign, counts, events: events ?? [] };
    }
    case "settings.health": {
      const provider = brevo();
      if (!provider) return { configured: false, connected: false, listId: BREVO_LIST_ID || null, senderId: BREVO_SENDER_ID || null };
      const health = await provider.health();
      const { data: lastWebhook } = await service.from("newsletter_campaign_events").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { data: lastSync } = await service.from("newsletter_subscribers").select("brevo_synced_at").not("brevo_synced_at", "is", null).order("brevo_synced_at", { ascending: false }).limit(1).maybeSingle();
      return { configured: true, connected: health.ok, error: health.ok ? null : health.error, listId: BREVO_LIST_ID, senderId: BREVO_SENDER_ID, lastWebhookAt: lastWebhook?.created_at ?? null, lastSyncAt: lastSync?.brevo_synced_at ?? null };
    }
    case "settings.resync": {
      const { data: rows, error: queryError } = await service.from("newsletter_subscribers").select("*").in("brevo_sync_status", ["pending", "failed"]).order("updated_at", { ascending: true }).limit(200);
      if (queryError) throw new Error("subscriber_list_failed");
      let synced = 0;
      for (let index = 0; index < (rows ?? []).length; index += 10) {
        const results = await Promise.all((rows ?? []).slice(index, index + 10).map((row: Row) => syncSubscriber(service, row)));
        synced += results.filter((result) => result.ok).length;
      }
      const { count } = await service.from("newsletter_subscribers").select("id", { count: "exact", head: true }).in("brevo_sync_status", ["pending", "failed"]);
      return { processed: (rows ?? []).length, synced, remaining: count ?? 0 };
    }
    default:
      throw new Error("invalid_action");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return error("Method not allowed", 405, "METHOD_NOT_ALLOWED");
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return error("Invalid JSON body");
  const action = str((body as Row).action, 60);
  const payload = (body as Row).payload && typeof (body as Row).payload === "object" ? (body as Row).payload as Row : {};

  try {
    const data = await handleAction(auth.service, auth.user, action, payload);
    return json({ data });
  } catch (caught) {
    const raw = caught instanceof Error ? caught.message : "unavailable";
    const providerError = raw.startsWith("provider:") ? raw.slice(9) : null;
    const known: Record<string, [string, number, string]> = {
      invalid_action: ["Unknown newsletter action", 400, "INVALID_ACTION"],
      required_field_missing: ["Complete every required campaign field", 400, "VALIDATION_FAILED"],
      invalid_content_blocks: ["Campaign content contains an unsupported block", 400, "VALIDATION_FAILED"],
      invalid_sender_email: ["Enter valid sender and reply-to email addresses", 400, "VALIDATION_FAILED"],
      campaign_not_found: ["Campaign not found", 404, "NOT_FOUND"],
      subscriber_not_found: ["Subscriber not found", 404, "NOT_FOUND"],
      campaign_not_editable: ["Only draft campaigns can be edited", 409, "CAMPAIGN_LOCKED"],
      campaign_not_cancellable: ["This campaign can no longer be cancelled", 409, "CAMPAIGN_LOCKED"],
      current_revision_not_tested: ["Send a successful test of the current revision first", 409, "TEST_REQUIRED"],
      renewed_consent_required: ["Confirm renewed consent before subscribing this address", 400, "CONSENT_REQUIRED"],
      audience_empty: ["This audience has no active subscribers", 400, "AUDIENCE_EMPTY"],
      audience_too_large: ["This audience exceeds the current safe delivery limit", 413, "AUDIENCE_TOO_LARGE"],
      audience_sync_required: ["Some recipients could not be synchronized with Brevo", 409, "AUDIENCE_SYNC_REQUIRED"],
      invalid_schedule: ["Choose a future delivery time", 400, "INVALID_SCHEDULE"],
      brevo_not_configured: ["Brevo is not configured", 503, "PROVIDER_NOT_CONFIGURED"],
      campaign_already_queued: ["This campaign was already queued by another request", 409, "ALREADY_QUEUED"],
    };
    const mapped = known[raw];
    if (mapped) return error(...mapped);
    if (providerError) return error(providerError, 502, "PROVIDER_ERROR");
    console.error("newsletter-admin action failed", action, raw);
    return error("Newsletter operation failed", 500, "UNAVAILABLE");
  }
});
