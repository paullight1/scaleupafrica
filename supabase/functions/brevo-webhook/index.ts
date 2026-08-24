import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { brevoEventKey, normalizeBrevoWebhookBatch } from "../_shared/brevo/webhook.ts";
import { providerSuppression } from "../_shared/brevo/transitions.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_TOKEN = Deno.env.get("BREVO_WEBHOOK_TOKEN")?.trim() ?? "";

type LooseClient = SupabaseClient<any, "public", any>;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!WEBHOOK_TOKEN || req.headers.get("Authorization") !== `Bearer ${WEBHOOK_TOKEN}`) {
    return json({ error: "unauthorized" }, 401);
  }

  const raw = await req.json().catch(() => null);
  const events = normalizeBrevoWebhookBatch(raw);
  if (!events.length) return json({ accepted: 0 }, 202);
  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) as LooseClient;
  let accepted = 0;

  for (const event of events) {
    const { data: campaign } = event.providerCampaignId
      ? await service.from("newsletter_campaigns").select("id,status").eq("brevo_campaign_id", event.providerCampaignId).maybeSingle()
      : { data: null };
    const record = {
      campaign_id: campaign?.id ?? null,
      provider_event_key: brevoEventKey(event),
      provider_event_id: event.providerEventId,
      provider_campaign_id: event.providerCampaignId,
      recipient_email: event.email,
      event_type: event.eventType,
      event_at: event.eventAt,
      clicked_url: event.clickedUrl,
      reason: event.reason,
      metadata: event.metadata,
    };
    const { error: insertError } = await service.from("newsletter_campaign_events")
      .upsert(record, { onConflict: "provider_event_key", ignoreDuplicates: true });
    if (insertError) {
      console.error("brevo-webhook event insert failed", insertError.message);
      continue;
    }
    accepted++;

    if (campaign?.id) {
      const recipientState: Record<string, string> = {
        delivered: "delivered", hard_bounced: "bounced", complained: "complained", unsubscribed: "unsubscribed",
      };
      if (recipientState[event.eventType]) {
        await service.from("newsletter_campaign_recipients").update({ state: recipientState[event.eventType] })
          .eq("campaign_id", campaign.id).eq("email", event.email);
      }
      if (["sent", "delivered", "opened", "clicked"].includes(event.eventType) && ["scheduled", "sending"].includes(campaign.status)) {
        await service.from("newsletter_campaigns").update({ status: "sent", sent_at: event.eventAt }).eq("id", campaign.id);
      }
    }

    const suppression = providerSuppression(event.eventType);
    if (suppression) {
      const { data: subscriber } = await service.from("newsletter_subscribers").select("id,status,source,consent_source").eq("email", event.email).maybeSingle();
      if (subscriber) {
        if (subscriber.status === "subscribed") {
          await service.from("newsletter_subscribers").update({
            status: "unsubscribed",
            unsubscribed_at: event.eventAt,
            unsubscribe_reason: suppression.reason,
            brevo_sync_status: "suppressed",
            brevo_synced_at: event.eventAt,
            brevo_sync_error: null,
          }).eq("id", subscriber.id);
        } else {
          await service.from("newsletter_consent_events").insert({
            subscriber_id: subscriber.id,
            email: event.email,
            event_type: suppression.consentEvent,
            source: subscriber.consent_source ?? subscriber.source ?? "brevo",
            reason: suppression.reason,
            provider_event_id: event.providerEventId,
          });
        }
      }
    }
  }
  return json({ accepted }, 202);
});
