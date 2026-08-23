const AI_GATEWAY_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_TIMEOUT_MS = 25_000;
const MAX_SOURCE_CHARS = 60_000;
const MAX_RAW_SOURCE_CHARS = 120_000;
const MAX_QUOTES = 10;
const MAX_LINKS = 100;

export interface ExtractedFundingSignals {
  cycle_label: string | null;
  explicit_open_text: string | null;
  explicit_closed_text: string | null;
  explicit_paused_text: string | null;
  rolling_text: string | null;
  application_cta_text: string | null;
  application_url: string | null;
  opens_text: string | null;
  opens_at: string | null;
  deadline_text: string | null;
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

  const rawSourceText = input.sourceText.replace(/\u0000/g, " ").slice(0, MAX_RAW_SOURCE_CHARS);
  const visibleSourceText = compactVisibleSource(rawSourceText).slice(0, MAX_SOURCE_CHARS);
  if (!visibleSourceText.trim()) return { ok: false, error: "invalid_ai_output" };
  const sourceLinks = Array.from(extractSourceLinks(rawSourceText, sourceUrl)).slice(0, MAX_LINKS);

  const system = `You extract funding application-cycle signals for Cresciva.\n\nTRUST RULES:\n- Use only supplied source text and supplied source links.\n- Do not use model memory or outside knowledge.\n- Every text signal must be an exact verbatim substring of source_text.\n- application_url must be one of source_links.\n- Do not infer open from a future deadline alone.\n- Do not substitute a historical or typical deadline.\n- Return null for unsupported fields.\n- Do not output a trusted application_status.\n- Do not call a programme rolling merely because no deadline is visible.\n- Dates must refer to the current application cycle described in the supplied source.\n- opens_text and deadline_text must be exact source_text snippets supporting opens_at and deadline_at.\n- If the source contains conflicting current-cycle statements, preserve the conflicting exact quotes instead of resolving them yourself.\n- Return only JSON with keys: cycle_label, explicit_open_text, explicit_closed_text, explicit_paused_text, rolling_text, application_cta_text, application_url, opens_text, opens_at, deadline_text, deadline_at, deadline_timezone, source_quotes.\n- opens_at and deadline_at must be ISO-8601 strings only when explicitly supported by their exact source text; otherwise null.\n- source_quotes must contain short verbatim snippets from supplied source_text that support extracted signals.`;

  const user = JSON.stringify({
    source_url: sourceUrl,
    source_text: visibleSourceText,
    source_links: sourceLinks,
  });

  let response: Response;
  try {
    response = await fetch(AI_GATEWAY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
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
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") return { ok: false, error: "invalid_ai_output" };
    const parsed = JSON.parse(content) as unknown;
    const signals = normalizeFundingSignalsForSource(parsed, rawSourceText, sourceUrl);
    return signals ? { ok: true, signals } : { ok: false, error: "invalid_ai_output" };
  } catch {
    return { ok: false, error: "invalid_ai_output" };
  }
}

/**
 * Pure trust boundary used by tests and the Edge extractor. Model output is only
 * retained when it can be tied back to exact fetched source text/links.
 */
export function normalizeFundingSignalsForSource(
  value: unknown,
  rawSourceText: string,
  sourceUrlRaw: string,
): ExtractedFundingSignals | null {
  if (!isRecord(value)) return null;
  const sourceUrl = validHttpUrl(sourceUrlRaw);
  if (!sourceUrl) return null;

  const visibleSourceText = compactVisibleSource(rawSourceText.replace(/\u0000/g, " ").slice(0, MAX_RAW_SOURCE_CHARS))
    .slice(0, MAX_SOURCE_CHARS);
  if (!visibleSourceText) return null;

  const allowedLinks = extractSourceLinks(rawSourceText.slice(0, MAX_RAW_SOURCE_CHARS), sourceUrl);
  const cycleLabel = exactSourceText(value.cycle_label, visibleSourceText, 160);
  const explicitOpenText = exactSourceText(value.explicit_open_text, visibleSourceText, 320);
  const explicitClosedText = exactSourceText(value.explicit_closed_text, visibleSourceText, 320);
  const explicitPausedText = exactSourceText(value.explicit_paused_text, visibleSourceText, 320);
  const rollingText = exactSourceText(value.rolling_text, visibleSourceText, 320);
  const applicationCtaText = exactSourceText(value.application_cta_text, visibleSourceText, 320);
  const opensText = exactSourceText(value.opens_text, visibleSourceText, 400);
  const deadlineText = exactSourceText(value.deadline_text, visibleSourceText, 400);

  const requestedApplicationUrl = nullableHttpUrl(value.application_url);
  const applicationUrl = requestedApplicationUrl && allowedLinks.has(requestedApplicationUrl)
    ? requestedApplicationUrl
    : null;
  const opensAt = supportedIsoDate(value.opens_at, opensText);
  const deadlineAt = supportedIsoDate(value.deadline_at, deadlineText);
  const deadlineTimezone = exactSourceText(value.deadline_timezone, visibleSourceText, 80);

  const quotes = Array.isArray(value.source_quotes)
    ? Array.from(new Set(value.source_quotes
      .map((quote) => safeString(quote, 320))
      .filter((quote) => Boolean(quote && visibleSourceText.includes(quote)))))
      .slice(0, MAX_QUOTES)
    : [];

  return {
    cycle_label: cycleLabel,
    explicit_open_text: explicitOpenText,
    explicit_closed_text: explicitClosedText,
    explicit_paused_text: explicitPausedText,
    rolling_text: rollingText,
    application_cta_text: applicationCtaText,
    application_url: applicationUrl,
    opens_text: opensText,
    opens_at: opensAt,
    deadline_text: deadlineText,
    deadline_at: deadlineAt,
    deadline_timezone: deadlineTimezone,
    source_quotes: quotes,
  };
}

function exactSourceText(value: unknown, sourceText: string, max: number): string | null {
  const text = nullableString(value, max);
  return text && sourceText.includes(text) ? text : null;
}

function supportedIsoDate(value: unknown, evidenceText: string | null): string | null {
  const raw = nullableString(value, 100);
  if (!raw || !evidenceText) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  const calendar = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!calendar) return null;
  const year = Number(calendar[1]);
  const month = Number(calendar[2]);
  const day = Number(calendar[3]);
  return dateQuoteSupportsCalendarDate(evidenceText, year, month, day) ? date.toISOString() : null;
}

const MONTH_NAMES = [
  ["january", "jan"], ["february", "feb"], ["march", "mar"], ["april", "apr"],
  ["may", "may"], ["june", "jun"], ["july", "jul"], ["august", "aug"],
  ["september", "sep", "sept"], ["october", "oct"], ["november", "nov"], ["december", "dec"],
] as const;

function dateQuoteSupportsCalendarDate(text: string, year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const lower = text.toLowerCase();
  if (!new RegExp(`\\b${year}\\b`).test(lower)) return false;
  const daySupported = new RegExp(`\\b0?${day}(?:st|nd|rd|th)?\\b`).test(lower);
  if (!daySupported) return false;
  const monthNumber = new RegExp(`\\b0?${month}\\b`).test(lower);
  const monthName = MONTH_NAMES[month - 1].some((name) => new RegExp(`\\b${name}\\b`).test(lower));
  return monthNumber || monthName;
}

function extractSourceLinks(raw: string, baseUrl: string): Set<string> {
  const links = new Set<string>([baseUrl]);
  const add = (rawLink: string) => {
    try {
      const resolved = new URL(rawLink.trim(), baseUrl);
      if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return;
      resolved.hash = "";
      links.add(resolved.href);
    } catch {
      // Ignore malformed page links.
    }
  };

  const attributePattern = /(?:href|action)\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = attributePattern.exec(raw)) !== null && links.size < MAX_LINKS) add(match[1]);

  const absolutePattern = /https?:\/\/[^\s"'<>]+/gi;
  while ((match = absolutePattern.exec(raw)) !== null && links.size < MAX_LINKS) {
    add(match[0].replace(/[),.;]+$/g, ""));
  }
  return links;
}

function compactVisibleSource(raw: string): string {
  return raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
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
