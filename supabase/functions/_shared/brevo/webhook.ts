import type { NewsletterEventType, NormalizedBrevoEvent } from "./types.ts";

const EMAIL_RE = /^[^\s@,;<>\"]+@[^\s@,;<>\"]+\.[^\s@,;<>\"]{2,}$/;

const EVENT_MAP: Record<string, NewsletterEventType> = {
  sent: "sent",
  delivered: "delivered",
  opened: "opened",
  uniqueopened: "opened",
  proxyopen: "opened",
  click: "clicked",
  clicked: "clicked",
  softbounce: "soft_bounced",
  hardbounce: "hard_bounced",
  spam: "complained",
  complained: "complained",
  unsubscribed: "unsubscribed",
  contactupdated: "contact_updated",
  contactdeleted: "contact_deleted",
};

function cleanEvent(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase().replace(/[^a-z]/g, "") : "";
}

function cleanString(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function cleanInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function eventTime(input: Record<string, unknown>): string | null {
  const seconds = typeof input.ts_event === "number" ? input.ts_event : Number(input.ts_event);
  if (Number.isFinite(seconds) && seconds > 0) return new Date(seconds * 1000).toISOString();
  const raw = cleanString(input.date_event ?? input.date, 80);
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function safeUrl(value: unknown): string | null {
  const raw = cleanString(value, 2_000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function metadata(input: Record<string, unknown>): NormalizedBrevoEvent["metadata"] {
  const out: NormalizedBrevoEvent["metadata"] = {};
  if (typeof input.tag === "string") out.tag = input.tag.slice(0, 120);
  if (Array.isArray(input.segment_ids)) {
    out.segmentIds = input.segment_ids.map(cleanInteger).filter((value): value is number => value != null).slice(0, 50);
  }
  if (typeof input["campaign name"] === "string") out.campaignName = input["campaign name"].slice(0, 160);
  return out;
}

export function normalizeBrevoWebhookEvent(value: unknown): NormalizedBrevoEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const eventType = EVENT_MAP[cleanEvent(input.event ?? input.event_name ?? input.msg_status)];
  const email = cleanString(input.email, 254)?.toLowerCase() ?? null;
  const eventAt = eventTime(input);
  if (!eventType || !email || !EMAIL_RE.test(email) || !eventAt) return null;

  const providerId = cleanString(input.id, 120) ?? (cleanInteger(input.id)?.toString() ?? null);
  return {
    providerEventId: providerId,
    providerCampaignId: cleanInteger(input.camp_id ?? input.campaign_id),
    email,
    eventType,
    eventAt,
    clickedUrl: safeUrl(input.URL ?? input.url),
    reason: cleanString(input.reason ?? input.description, 500),
    metadata: metadata(input),
  };
}

export function normalizeBrevoWebhookBatch(value: unknown): NormalizedBrevoEvent[] {
  const inputs = Array.isArray(value) ? value.slice(0, 500) : [value];
  return inputs.map(normalizeBrevoWebhookEvent).filter((event): event is NormalizedBrevoEvent => event != null);
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function brevoEventKey(event: NormalizedBrevoEvent): string {
  if (event.providerEventId) return `brevo:${event.providerEventId}`;
  return `brevo:derived:${fnv1a([
    event.providerCampaignId ?? "",
    event.email,
    event.eventType,
    event.eventAt,
    event.clickedUrl ?? "",
  ].join("|"))}`;
}
