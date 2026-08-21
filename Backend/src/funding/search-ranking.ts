export interface SearchableFundingOpportunity {
  title: string;
  funder: string;
  type?: string | null;
  summary?: string | null;
  eligibility?: string | null;
  tags?: string[] | null;
  countryFocus?: string[] | null;
  url?: string | null;
}

const STOP_WORDS = new Set([
  "and",
  "for",
  "from",
  "funding",
  "opportunity",
  "program",
  "the",
  "with",
]);

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: unknown): string[] {
  return Array.from(
    new Set(
      normalize(value)
        .split(" ")
        .filter((token) => token.length >= 2 && !STOP_WORDS.has(token)),
    ),
  );
}

function tokenSet(values: unknown[]): Set<string> {
  return new Set(values.flatMap(tokens));
}

function matched(query: string[], haystack: Set<string>): string[] {
  return query.filter((token) => haystack.has(token));
}

export function scoreFundingSearch(
  query: string,
  opportunity: SearchableFundingOpportunity,
): number {
  const queryTokens = tokens(query);
  if (queryTokens.length === 0) return 0;

  const title = tokenSet([opportunity.title]);
  const funder = tokenSet([opportunity.funder]);
  const type = tokenSet([opportunity.type]);
  const summary = tokenSet([opportunity.summary]);
  const eligibility = tokenSet([opportunity.eligibility]);
  const tags = tokenSet(opportunity.tags ?? []);
  const countries = tokenSet(opportunity.countryFocus ?? []);

  let score = 0;
  for (const token of queryTokens) {
    if (tags.has(token)) score += 8;
    if (countries.has(token)) score += 8;
    if (title.has(token)) score += 6;
    if (funder.has(token)) score += 4;
    if (type.has(token)) score += 3;
    if (summary.has(token)) score += 2;
    if (eligibility.has(token)) score += 2;
  }

  const phrase = normalize(query);
  if (phrase.length >= 5) {
    if (normalize(opportunity.title).includes(phrase)) score += 8;
    else if (normalize(opportunity.summary).includes(phrase)) score += 4;
  }
  return score;
}

export function fundingSearchReasons(
  query: string,
  opportunity: SearchableFundingOpportunity,
): string[] {
  const queryTokens = tokens(query);
  const reasons: string[] = [];
  const tagMatches = matched(queryTokens, tokenSet(opportunity.tags ?? []));
  const countryMatches = matched(queryTokens, tokenSet(opportunity.countryFocus ?? []));
  const titleMatches = matched(queryTokens, tokenSet([opportunity.title]));
  const funderMatches = matched(queryTokens, tokenSet([opportunity.funder]));

  if (countryMatches.length > 0) reasons.push(`Available in ${countryMatches.slice(0, 2).join(", ")}.`);
  if (tagMatches.length > 0) reasons.push(`Matches ${tagMatches.slice(0, 3).join(", ")} focus.`);
  if (titleMatches.length > 0) reasons.push(`Program title matches ${titleMatches.slice(0, 3).join(", ")}.`);
  if (funderMatches.length > 0) reasons.push(`Matches the ${opportunity.funder} funder.`);
  return Array.from(new Set(reasons)).slice(0, 4);
}

export function rankFundingSearch<T extends SearchableFundingOpportunity>(
  query: string,
  items: T[],
  limit = 12,
): T[] {
  return items
    .map((item, index) => ({ item, index, score: scoreFundingSearch(query, item) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, limit))
    .map(({ item }) => item);
}

function canonicalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    url.search = "";
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function identity(item: SearchableFundingOpportunity): string {
  const url = canonicalUrl(item.url);
  if (url) return `url:${url}`;
  return `text:${normalize(item.title)}|${normalize(item.funder)}`;
}

export function dedupeFundingSearchResults<T extends SearchableFundingOpportunity>(
  verified: T[],
  ai: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of [...verified, ...ai]) {
    const key = identity(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
