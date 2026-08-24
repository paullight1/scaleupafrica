import type { NewsletterEventType } from "./types.ts";

export interface SyncSubscriberState {
  status: "subscribed" | "unsubscribed";
  brevo_sync_status: "pending" | "synced" | "failed" | "suppressed";
}

export function contactSyncIntent(state: SyncSubscriberState): {
  operation: "upsert" | "suppress";
  emailBlacklisted: boolean;
} {
  if (state.status !== "subscribed" || state.brevo_sync_status === "suppressed") {
    return { operation: "suppress", emailBlacklisted: true };
  }
  return { operation: "upsert", emailBlacklisted: false };
}

export function canDeliverCampaign(state: {
  revision: number;
  last_test_revision: number | null;
  last_test_status: "sent" | "failed" | null;
}): boolean {
  return state.last_test_status === "sent" && state.last_test_revision === state.revision;
}

export function providerSuppression(eventType: NewsletterEventType): {
  reason: "complained" | "hard_bounced" | "provider_unsubscribe";
  consentEvent: "complained" | "hard_bounced" | "unsubscribed";
} | null {
  if (eventType === "complained") return { reason: "complained", consentEvent: "complained" };
  if (eventType === "hard_bounced") return { reason: "hard_bounced", consentEvent: "hard_bounced" };
  if (eventType === "unsubscribed") return { reason: "provider_unsubscribe", consentEvent: "unsubscribed" };
  return null;
}
