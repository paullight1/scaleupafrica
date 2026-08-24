import { describe, expect, it } from "vitest";
import {
  brevoEventKey,
  normalizeBrevoWebhookBatch,
  normalizeBrevoWebhookEvent,
} from "../../../../supabase/functions/_shared/brevo/webhook.ts";

describe("Brevo marketing webhook normalization", () => {
  it("maps an unsubscribe into a normalized, lowercase consent event", () => {
    const event = normalizeBrevoWebhookEvent({
      id: 91,
      event: "unsubscribed",
      email: "Founder@Example.com",
      camp_id: 12,
      ts_event: 1_725_000_000,
      reason: "contact requested",
    });

    expect(event).toEqual({
      providerEventId: "91",
      providerCampaignId: 12,
      email: "founder@example.com",
      eventType: "unsubscribed",
      eventAt: "2024-08-30T06:40:00.000Z",
      clickedUrl: null,
      reason: "contact requested",
      metadata: {},
    });
  });

  it("normalizes Brevo event spellings and ignores unknown events", () => {
    expect(normalizeBrevoWebhookEvent({
      id: 1,
      event: "hard_bounce",
      email: "a@example.com",
      ts_event: 1_725_000_000,
    })?.eventType).toBe("hard_bounced");
    expect(normalizeBrevoWebhookEvent({
      id: 2,
      event: "click",
      email: "a@example.com",
      ts_event: 1_725_000_000,
      URL: "https://cresciva.test/funding",
    })).toMatchObject({ eventType: "clicked", clickedUrl: "https://cresciva.test/funding" });
    expect(normalizeBrevoWebhookEvent({ event: "mystery", email: "a@example.com" })).toBeNull();
  });

  it("accepts single and batched payloads while dropping malformed entries", () => {
    const batch = normalizeBrevoWebhookBatch([
      { id: 1, event: "delivered", email: "one@example.com", ts_event: 1_725_000_000 },
      { id: 2, event: "opened", email: "not-an-email", ts_event: 1_725_000_000 },
      { id: 3, event: "spam", email: "two@example.com", ts_event: 1_725_000_001 },
    ]);

    expect(batch).toHaveLength(2);
    expect(normalizeBrevoWebhookBatch({
      id: 4,
      event: "soft_bounce",
      email: "three@example.com",
      ts_event: 1_725_000_002,
    })).toHaveLength(1);
  });

  it("builds the same idempotency key for a repeated delivery", () => {
    const input = {
      providerEventId: "91",
      providerCampaignId: 12,
      email: "founder@example.com",
      eventType: "unsubscribed" as const,
      eventAt: "2024-08-30T06:40:00.000Z",
      clickedUrl: null,
      reason: null,
      metadata: {},
    };

    expect(brevoEventKey(input)).toBe(brevoEventKey({ ...input }));
    expect(brevoEventKey(input)).toBe("brevo:91");
  });
});
