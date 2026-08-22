import { safeExternalFetch } from "./safeExternalFetch.ts";

export const MAX_SEARCH_RESULTS = 8;
export const MAX_EVIDENCE_FETCHES = 6;
const SEARCH_TIMEOUT_MS = 8_000;
const AI_TIMEOUT_MS = 25_000;
const BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const AI_GATEWAY_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type BusinessDiscoveryError =
  | "provider_unavailable"
  | "provider_error"
  | "no_evidence"
  | "invalid_ai_output";

export interface SearchCandidate {
  title: string;
  url: string;
  description: string;
}

export interface EnrichedBusinessCandidate {
  id: string;
  canonicalName: string;
  website: string | null;
  country: string | null;
  summary: string | null;
  sourceUrls: string[];
  enrichedProfile: Record<string, unknown>;
  fieldEvidence: Record<string, unknown>;
}

interface BraveResponse {
  web?: {
    results?: Array<{ title?: unknown; url?: unknown; description?: unknown }>;
  };
}

interface EvidencePage {
  url: string;
  contentType: string;
  text: string;
}

interface AiCandidate {
  canonical_name?: unknown;
  website?: unknown;
  country?: unknown;
  summary?: unknown;
  organisation_type?: unknown;
  sectors?: unknown;
  operating_countries?: unknown;
  founding_year?: unknown;
  keywords?: unknown;
  source_urls?: unknown;
  field_evidence?: unknown;
}

export async function discoverBusinessCandidates(input: {
  businessName: string;
  website?: string | null;
  countryHint?: string | null;
  braveApiKey?: string | null;
  aiApiKey?: string | null;
}): Promise<{ ok: true; candidates: EnrichedBusinessCandidate[] } | { ok: false; error: BusinessDiscoveryError }> {
  const braveKey = input.braveApiKey?.trim() ?? "";
  if (!braveKey) return { ok: false, error: "provider_unavailable" };

  const search = await searchBrave(input.businessName, input.countryHint, braveKey);
  if (!search.ok) return search;

  // User-provided website is evidence priority #1, then bounded provider results.
  const urls = dedupeUrls([
    ...(input.website ? [input.website] : []),
    ...search.results.map((result) => result.url),
  ]).slice(0, MAX_EVIDENCE_FETCHES);

  const evidence: EvidencePage[] = [];
  for (const url of urls) {
    const result = await safeExternalFetch(url);
    if (!result.ok) continue;
    evidence.push({
      url: result.url,
      contentType: result.contentType,
      text: compactEvidence(result.body),
    });
  }

  if (!evidence.length) return { ok: false, error: "no_evidence" };

  const aiKey = input.aiApiKey?.trim() ?? "";
  if (!aiKey) {
    // Without an extraction provider, evidence is retained conceptually but we do
    // not manufacture a structured candidate from search snippets.
    return { ok: false, error: "provider_unavailable" };
  }

  const extracted = await extractCandidatesFromEvidence(
    input.businessName,
    input.countryHint,
    evidence,
    aiKey,
  );
  if (!extracted.ok) return extracted;

  const candidates = extracted.candidates
    .map(normalizeExtractedCandidate)
    .filter((candidate): candidate is EnrichedBusinessCandidate => candidate !== null)
    .slice(0, MAX_SEARCH_RESULTS);

  return candidates.length ? { ok: true, candidates } : { ok: false, error: "invalid_ai_output" };
}

async function searchBrave(
  businessName: string,
  countryHint: string | null | undefined,
  apiKey: string,
): Promise<{ ok: true; results: SearchCandidate[] } | { ok: false; error: BusinessDiscoveryError }> {
  const query = `"${businessName}" ${countryHint?.trim() ?? ""} official`.trim();
  const url = new URL(BRAVE_SEARCH_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(MAX_SEARCH_RESULTS));
  url.searchParams.set("safesearch", "moderate");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, error: "provider_error" };
  }

  if (!response.ok) return { ok: false, error: response.status === 401 || response.status === 403 ? "provider_unavailable" : "provider_error" };

  let payload: BraveResponse;
  try {
    payload = await response.json() as BraveResponse;
  } catch {
    return { ok: false, error: "provider_error" };
  }

  const results: SearchCandidate[] = [];
  for (const raw of payload.web?.results ?? []) {
    const candidateUrl = validHttpUrl(raw.url);
    if (!candidateUrl) continue;
    results.push({
      title: safeString(raw.title, 240),
      url: candidateUrl,
      description: safeString(raw.description, 600),
    });
    if (results.length >= MAX_SEARCH_RESULTS) break;
  }
  return { ok: true, results };
}

async function extractCandidatesFromEvidence(
  businessName: string,
  countryHint: string | null | undefined,
  evidence: EvidencePage[],
  apiKey: string,
): Promise<{ ok: true; candidates: AiCandidate[] } | { ok: false; error: BusinessDiscoveryError }> {
  const system = `You extract structured organisation facts for Cresciva funding intelligence.\n\nCRITICAL EVIDENCE RULES:\n- Use only the supplied public evidence.\n- Do not use model memory, outside knowledge, or assumptions.\n- Return null or [] for unsupported fields.\n- Every non-null factual field must be traceable in field_evidence to one or more supplied source_urls.\n- Search-result snippets are discovery hints only; only supplied fetched evidence may support facts.\n- Never infer sensitive personal characteristics, including religion, ethnicity, sexual orientation, health, political beliefs, trade-union membership, criminal history, or sex life.\n- Do not infer founder demographics from names, photos, pronouns, geography, or organisation mission.\n- Return only JSON with a candidates array.\n- Candidate fields: canonical_name, website, country, summary, organisation_type, sectors[], operating_countries[], founding_year, keywords[], source_urls[], field_evidence{}.\n- Prefer one candidate when evidence clearly identifies one organisation; multiple candidates are allowed only when the supplied pages genuinely conflict on identity.`;

  const user = JSON.stringify({
    requested_business_name: businessName,
    country_hint: countryHint ?? null,
    evidence: evidence.map((page) => ({
      url: page.url,
      content_type: page.contentType,
      text: page.text,
    })),
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
        max_tokens: 3000,
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, error: "provider_error" };
  }

  if (!response.ok) return { ok: false, error: "provider_error" };
  try {
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") return { ok: false, error: "invalid_ai_output" };
    const parsed = JSON.parse(content) as { candidates?: unknown };
    return Array.isArray(parsed.candidates)
      ? { ok: true, candidates: parsed.candidates.filter(isRecord) as AiCandidate[] }
      : { ok: false, error: "invalid_ai_output" };
  } catch {
    return { ok: false, error: "invalid_ai_output" };
  }
}

function normalizeExtractedCandidate(raw: AiCandidate): EnrichedBusinessCandidate | null {
  const canonicalName = safeString(raw.canonical_name, 200);
  const sourceUrls = stringArray(raw.source_urls, 10).map(validHttpUrl).filter((v): v is string => Boolean(v));
  if (!canonicalName || !sourceUrls.length) return null;

  const website = validHttpUrl(raw.website);
  const country = nullableString(raw.country, 120);
  const summary = nullableString(raw.summary, 1000);
  const organisationType = nullableString(raw.organisation_type, 80);
  const sectors = stringArray(raw.sectors, 12, 80);
  const operatingCountries = stringArray(raw.operating_countries, 30, 120);
  const keywords = stringArray(raw.keywords, 20, 80);
  const foundingYear = normalizeYear(raw.founding_year);
  const fieldEvidence = isRecord(raw.field_evidence) ? sanitizeEvidenceMap(raw.field_evidence, sourceUrls) : {};

  return {
    id: crypto.randomUUID(),
    canonicalName,
    website,
    country,
    summary,
    sourceUrls,
    enrichedProfile: {
      organisation_type: organisationType,
      sectors,
      operating_countries: operatingCountries,
      founding_year: foundingYear,
      keywords,
      short_description: summary,
      website,
      country,
    },
    fieldEvidence,
  };
}

function sanitizeEvidenceMap(value: Record<string, unknown>, allowedUrls: string[]): Record<string, unknown> {
  const allowed = new Set(allowedUrls);
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value).slice(0, 30)) {
    if (!/^[a-z0-9_]{1,80}$/i.test(key)) continue;
    const urls = stringArray(raw, 10).map(validHttpUrl).filter((url): url is string => Boolean(url && allowed.has(url)));
    if (urls.length) out[key] = urls;
  }
  return out;
}

function compactEvidence(raw: string): string {
  return raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30_000);
}

function validHttpUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function safeString(raw: unknown, max: number): string {
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

function nullableString(raw: unknown, max: number): string | null {
  const value = safeString(raw, max);
  return value || null;
}

function stringArray(raw: unknown, maxItems: number, maxLength = 1000): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw
    .map((value) => safeString(value, maxLength))
    .filter(Boolean)))
    .slice(0, maxItems);
}

function normalizeYear(raw: unknown): number | null {
  const year = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
  return Number.isInteger(year) && year >= 1800 && year <= 2100 ? year : null;
}

function dedupeUrls(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const url = validHttpUrl(raw);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
