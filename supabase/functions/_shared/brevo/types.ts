export interface BrevoConfig {
  apiKey: string;
  listId: number;
  senderId: number;
}

export type BrevoResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; retryable: boolean; error: string };

export interface BrevoContactInput {
  email: string;
  subscriberId: string;
  subscribed: boolean;
}

export interface BrevoCampaignInput {
  name: string;
  subject: string;
  previewText: string;
  htmlContent: string;
  replyTo: string;
  senderName: string;
  scheduledAt?: string;
  audienceListId?: number;
}

export type NewsletterEventType =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "soft_bounced"
  | "hard_bounced"
  | "complained"
  | "unsubscribed"
  | "contact_updated"
  | "contact_deleted";

export interface NormalizedBrevoEvent {
  providerEventId: string | null;
  providerCampaignId: number | null;
  email: string;
  eventType: NewsletterEventType;
  eventAt: string;
  clickedUrl: string | null;
  reason: string | null;
  metadata: Record<string, string | number | boolean | string[] | number[]>;
}
