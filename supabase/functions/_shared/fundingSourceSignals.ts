const AI_GATEWAY_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_TIMEOUT_MS = 25_000;
const MAX_SOURCE_CHARS = 60_000;
const MAX_QUOTES = 10;

export interface ExtractedFundingSignals {
  cycle_label: string | null;
  explicit_open_text: string | null;
  explicit_closed_text: string | null;
  explicit_paused_text: string | null;
  rolling_text: string | null;
  application_cta_text: string | null;
  application_url: string | null;
  opens_at: string | null;
  deadline_at: string | null;
  deadline_timezone: string | null;
  source_quotes: string[];
}

export type FundingSignalExtractionResult =
  | { ok: true; signals: ExtractedFundingSignals }
  | { ok: false; error: "provider_unavailable" | "provider_error" | "invalid_ai_output" };

/**
 * Extract candidate source signals only. This module deliberately cannot return
 * Cresciva's trusted application status; `classifyFundingStatus` owns that decision.
 */
export async function extractFundingSourceSignals(input: {
  sourceUrl: string;
  sourceText: string;
  aiApiKey?: string | null;
}): Promise<FundingSignalExtractionResult> {
  const apiKey = input.aiApiKey?.trim() ?? "";
  if (!apiKey) return { ok: false, error: "provider_unavailable" };

  const sourceUrl = validHttpUrl(input.sourceUrl);
  if (!sourceUrl) return { ok: false, error: "invalid_ai_output" };

  const sourceText = input.sourceText.replace(/\u0000/g, " ").slice(0, MAX_SOURCE_CHARS);
  if (!sourceText.trim()) return { ok: false, error: "invalid_ai_output" };

  const system = `You extract funding application-cycle signals for Cresciva.\n\nTRUST RULES:\n- Use only supplied source text.\n- Do not use model memory or outside knowledge.\n- Do not infer open from a future deadline alone.\n- Do not substitute a historical or typical deadline.\n- Return null for unsupported fields.\n- Do not output a trusted application_status.\n- Do not call a programme rolling merely because no deadline is visible.\n- Dates must refer to the current application cycle described in the supplied source.\n- If the source contains conflicting current-cycle statements, preserve the conflicting quotes instead of resolving them yourself.\n- Return only JSON with keys: cycle_label, explicit_open_text, explicit_closed_text, explicit_paused_text, rolling_text, application_cta_text, application_url, opens_at, deadline_at, deadline_timezone, source_quotes.\n- opens_at and deadline_at must be ISO-8601 strings only when explicitly supported by the current-cycle source; otherwise null.\n- source_quotes must contain short verbatim snippets from the supplied source that support the extracted signals.`;

  const user = JSON.stringify({
    source_url: sourceUrl,
    source_text: sourceText,
  });

  let response: Response;
  try {
    response = await fetch(AI_GATEWAY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1800,
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, error: "provider_error" };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: response.status === 401 || response.status === 403
        ? "provider_unavailable"
        : "provider_error",
    };
  }

  try {
    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") return { ok: false, error: "invalid_ai_output" };
    const parsed = JSON.parse(content) as unknown;
    const signals = normalizeSignals(parsed);
    return signals ? { ok: true, signals } : { ok: false, error: "invalid_ai_output" };
  } catch {
    return { ok: false, error: "invalid_ai_output" };
  }
}

function normalizeSignals(value: unknown): ExtractedFundingSignals | null {
  if (!isRecord(value)) return null;

  const applicationUrl = nullableHttpUrl(value.application_url);
  const opensAt = nullableIsoDate(value.opens_at);
  const deadlineAt = nullableIsoDate(value.deadline_at);
  const quotes = Array.isArray(value.source_quotes)
    ? Array.from(new Set(value.source_quotes
      .map((quote) => safeString(quote, 320))
      .filter(Boolean)))
      .slice(0, MAX_QUOTES)
    : [];

  return {
    cycle_label: nullableString(value.cycle_label, 160),
    explicit_open_text: nullableString(value.explicit_open_text, 320),
    explicit_closed_text: nullableString(value.explicit_closed_text, 320),
    explicit_paused_text: nullableString(value.explicit_paused_text, 320),
    rolling_text: nullableString(value.rolling_text, 320),
    application_cta_text: nullableString(value.application_cta_text, 320),
    application_url: applicationUrl,
    opens_at: opensAt,
    deadline_at: deadlineAt,
    deadline_timezone: nullableString(value.deadline_timezone, 80),
    source_quotes: quotes,
  };
}

function nullableIsoDate(value: unknown): string | null {
  const raw = nullableString(value, 100);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function nullableHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return validHttpUrl(value);
}

function validHttpUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function nullableString(value: unknown, max: number): string | null {
  const text = safeString(value, max);
  return text || null;
}

function safeString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
