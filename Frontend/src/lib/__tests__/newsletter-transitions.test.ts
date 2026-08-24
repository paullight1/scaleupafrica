import { describe, expect, it } from "vitest";
import {
  canDeliverCampaign,
  contactSyncIntent,
  providerSuppression,
} from "../../../../supabase/functions/_shared/brevo/transitions.ts";

describe("newsletter campaign transitions", () => {
  it("never resubscribes a locally suppressed subscriber during routine sync", () => {
    expect(contactSyncIntent({ status: "unsubscribed", brevo_sync_status: "suppressed" })).toEqual({
      operation: "suppress",
      emailBlacklisted: true,
    });
  });

  it("upserts only locally subscribed contacts", () => {
    expect(contactSyncIntent({ status: "subscribed", brevo_sync_status: "failed" })).toEqual({
      operation: "upsert",
      emailBlacklisted: false,
    });
  });

  it("requires a successful test for the exact content revision", () => {
    expect(canDeliverCampaign({ revision: 4, last_test_revision: 3, last_test_status: "sent" })).toBe(false);
    expect(canDeliverCampaign({ revision: 4, last_test_revision: 4, last_test_status: "failed" })).toBe(false);
    expect(canDeliverCampaign({ revision: 4, last_test_revision: 4, last_test_status: "sent" })).toBe(true);
  });

  it("maps complaint and bounce events to irreversible local suppression", () => {
    expect(providerSuppression("complained")).toEqual({ reason: "complained", consentEvent: "complained" });
    expect(providerSuppression("hard_bounced")).toEqual({ reason: "hard_bounced", consentEvent: "hard_bounced" });
    expect(providerSuppression("unsubscribed")).toEqual({ reason: "provider_unsubscribe", consentEvent: "unsubscribed" });
    expect(providerSuppression("opened")).toBeNull();
  });
});
