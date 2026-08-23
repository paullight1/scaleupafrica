export interface BusinessIdentityInput {
  businessName: string;
  website?: string | null;
  countryHint?: string | null;
}

export interface ScoredBusinessIdentityCandidate {
  id: string;
  canonicalName: string;
  website?: string | null;
  country?: string | null;
  summary?: string | null;
  sourceUrls: string[];
}

export interface BusinessIdentitySelection {
  state: "resolved" | "ambiguous" | "not_found";
  candidate?: ScoredBusinessIdentityCandidate;
  score: number;
  margin: number;
  ranked: Array<{ candidate: ScoredBusinessIdentityCandidate; score: number }>;
}

const STOP = new Set(["the", "and", "of", "for", "limited", "ltd", "inc", "llc", "plc"]);

function normalize(value: string | null | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string | null | undefined): string[] {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP.has(token));
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const left = new Set(a);
  const right = new Set(b);
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function domain(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function scoreBusinessIdentity(
  input: BusinessIdentityInput,
  candidate: ScoredBusinessIdentityCandidate,
): number {
  const inputName = normalize(input.businessName);
  const candidateName = normalize(candidate.canonicalName);
  let score = 0;

  if (inputName && inputName === candidateName) score += 45;

  const similarity = jaccard(tokens(input.businessName), tokens(candidate.canonicalName));
  score += 25 * similarity;

  const hintedDomain = domain(input.website);
  const candidateDomain = domain(candidate.website);
  if (hintedDomain && candidateDomain && hintedDomain === candidateDomain) score += 25;

  const countryHint = normalize(input.countryHint);
  const candidateCountry = normalize(candidate.country);
  if (countryHint && candidateCountry) {
    if (countryHint === candidateCountry) score += 15;
    else score -= 30;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  if (!candidate.sourceUrls?.length) score = Math.min(score, 59);
  return score;
}

export function selectBusinessIdentity(
  input: BusinessIdentityInput,
  candidates: ScoredBusinessIdentityCandidate[],
): BusinessIdentitySelection {
  const ranked = candidates
    .map((candidate) => ({ candidate, score: scoreBusinessIdentity(input, candidate) }))
    .sort((a, b) => b.score - a.score || a.candidate.id.localeCompare(b.candidate.id));

  const top = ranked[0];
  const second = ranked[1];
  const score = top?.score ?? 0;
  const margin = top ? score - (second?.score ?? 0) : 0;

  if (!top || score < 60) {
    return { state: "not_found", score, margin, ranked };
  }

  if (score >= 85 && (!second || margin >= 15)) {
    return { state: "resolved", candidate: top.candidate, score, margin, ranked };
  }

  return { state: "ambiguous", score, margin, ranked };
}

export const _internal = { normalize, tokens, jaccard, domain };
