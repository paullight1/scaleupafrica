import type {
  BrevoCampaignInput,
  BrevoConfig,
  BrevoContactInput,
  BrevoResult,
} from "./types.ts";

const BREVO_API = "https://api.brevo.com/v3";
const API_KEY_RE = /xkeysib-[A-Za-z0-9_-]+/gi;

export interface BrevoClientOptions {
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
  maxAttempts?: number;
  timeoutMs?: number;
}

export function redactBrevoError(value: unknown): string {
  return String(value ?? "Brevo request failed").replace(API_KEY_RE, "xkeysib-***").slice(0, 500);
}

function isRetryable(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createBrevoClient(config: BrevoConfig, options: BrevoClientOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleepImpl = options.sleepImpl ?? defaultSleep;
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const timeoutMs = Math.max(500, options.timeoutMs ?? 10_000);

  async function request<T>(path: string, init: RequestInit = {}): Promise<BrevoResult<T>> {
    let last: BrevoResult<T> = { ok: false, status: 0, retryable: true, error: "Brevo request failed" };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(`${BREVO_API}${path}`, {
          ...init,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "api-key": config.apiKey,
            ...(init.headers ?? {}),
          },
          signal: controller.signal,
        });
        const raw = await response.text().catch(() => "");
        let parsed: unknown = null;
        if (raw) {
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
        }
        if (response.ok) return { ok: true, data: parsed as T };

        const providerMessage = parsed && typeof parsed === "object" && "message" in parsed
          ? (parsed as { message?: unknown }).message
          : parsed || response.statusText;
        last = {
          ok: false,
          status: response.status,
          retryable: isRetryable(response.status),
          error: redactBrevoError(providerMessage),
        };
      } catch (error) {
        last = {
          ok: false,
          status: 0,
          retryable: true,
          error: redactBrevoError(error instanceof Error ? error.message : error),
        };
      } finally {
        clearTimeout(timer);
      }

      if (!last.retryable || attempt === maxAttempts) return last;
      await sleepImpl(300 * 2 ** (attempt - 1));
    }
    return last;
  }

  return {
    health: () => request<{ plan?: Array<{ type?: string }> }>("/account", { method: "GET" }),

    upsertContact(input: BrevoContactInput) {
      return request<{ id?: number }>("/contacts", {
        method: "POST",
        body: JSON.stringify({
          email: normalizeEmail(input.email),
          ext_id: input.subscriberId,
          listIds: [config.listId],
          emailBlacklisted: !input.subscribed,
          updateEnabled: true,
          getId: true,
        }),
      });
    },

    suppressContact(input: Omit<BrevoContactInput, "subscribed">) {
      return request<{ id?: number }>("/contacts", {
        method: "POST",
        body: JSON.stringify({
          email: normalizeEmail(input.email),
          ext_id: input.subscriberId,
          emailBlacklisted: true,
          unlinkListIds: [config.listId],
          updateEnabled: true,
          getId: true,
        }),
      });
    },

    createCampaign(input: BrevoCampaignInput) {
      return request<{ id: number }>("/emailCampaigns", {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          sender: { id: config.senderId, name: input.senderName },
          recipients: { listIds: [config.listId] },
          subject: input.subject,
          previewText: input.previewText,
          htmlContent: input.htmlContent,
          replyTo: input.replyTo,
          ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
        }),
      });
    },

    sendTest(campaignId: number, email: string) {
      return request<null>(`/emailCampaigns/${campaignId}/sendTest`, {
        method: "POST",
        body: JSON.stringify({ emailTo: [normalizeEmail(email)] }),
      });
    },

    scheduleCampaign(campaignId: number, scheduledAt: string) {
      return request<null>(`/emailCampaigns/${campaignId}`, {
        method: "PUT",
        body: JSON.stringify({ scheduledAt, recipients: { listIds: [config.listId] } }),
      });
    },

    sendCampaign(campaignId: number) {
      return request<null>(`/emailCampaigns/${campaignId}/sendNow`, { method: "POST" });
    },

    cancelCampaign(campaignId: number) {
      return request<null>(`/emailCampaigns/${campaignId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "cancel" }),
      });
    },

    getCampaign(campaignId: number) {
      return request<Record<string, unknown>>(`/emailCampaigns/${campaignId}?statistics=globalStats&excludeHtmlContent=true`, { method: "GET" });
    },
  };
}
