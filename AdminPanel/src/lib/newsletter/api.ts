import { supabase } from "@shared/integrations/supabase/client";

export type NewsletterAction =
  | "overview"
  | "subscribers.list"
  | "subscriber.consent"
  | "subscriber.add"
  | "subscriber.status"
  | "subscriber.retry"
  | "campaigns.list"
  | "campaign.get"
  | "campaign.save"
  | "campaign.duplicate"
  | "audience.estimate"
  | "campaign.test"
  | "campaign.deliver"
  | "campaign.cancel"
  | "campaign.report"
  | "settings.health"
  | "settings.resync";

type Envelope<T> = { data?: T; error?: string; code?: string };

async function responseMessage(error: unknown): Promise<string | null> {
  if (!error || typeof error !== "object" || !("context" in error)) return null;
  const context = (error as { context?: unknown }).context;
  if (!(context instanceof Response)) return null;
  try {
    const body = await context.clone().json() as { error?: unknown };
    return typeof body.error === "string" && body.error.trim() ? body.error.trim().slice(0, 500) : null;
  } catch {
    return null;
  }
}

export async function newsletterAdmin<T>(action: NewsletterAction, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke<Envelope<T>>("newsletter-admin", {
    body: { action, payload },
  });
  if (data?.error) throw new Error(data.error);
  if (error) throw new Error((await responseMessage(error)) ?? "Newsletter service is unavailable");
  if (!data || !("data" in data)) throw new Error("Newsletter service returned an invalid response");
  return data.data as T;
}
