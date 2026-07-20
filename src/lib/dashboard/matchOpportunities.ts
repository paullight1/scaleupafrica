import type { FundingOpportunity, Profile } from "./types";

/**
 * Cheap, deterministic client-side ranking of the curated funding feed against a
 * profile's country / keywords / sector (plan 03 §2.4). No AI. Score rules:
 *   +3 country match (or open/pan-African country_focus)
 *   +2 per keyword∩tags overlap, capped at +6
 *   +2 sector word-overlaps tags/title/summary
 *   +1 featured
 */

const PAN_AFRICAN = new Set(["africa", "pan-african", "pan african", "all"]);

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function normArray(a: string[] | null | undefined): string[] {
  return (a ?? []).map(norm).filter(Boolean);
}

/** Split a sector like "Agriculture & AgriTech, Food" into lowercase words. */
function sectorWords(sector: string | null | undefined): string[] {
  return norm(sector)
    .split(/[&,/]+/)
    .flatMap((chunk) => chunk.split(/\s+/))
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);
}

export function scoreOpportunity(p: Profile, o: FundingOpportunity): number {
  let score = 0;

  // Country
  const focus = normArray(o.country_focus);
  const openFocus = focus.length === 0 || focus.every((f) => PAN_AFRICAN.has(f));
  if (openFocus || focus.includes(norm(p.country))) {
    score += 3;
  }

  // Keyword ∩ tags overlap (capped)
  const tags = normArray(o.tags);
  const tagSet = new Set(tags);
  const keywords = normArray(p.keywords);
  let overlap = 0;
  for (const kw of new Set(keywords)) {
    if (tagSet.has(kw)) overlap += 1;
  }
  score += Math.min(overlap * 2, 6);

  // Sector word match against tags / title / summary
  const words = sectorWords(p.sector);
  const haystack = [tags.join(" "), norm(o.title), norm(o.summary)].join(" ");
  if (words.some((w) => haystack.includes(w))) {
    score += 2;
  }

  // Featured nudge
  if (o.featured) score += 1;

  return score;
}

function createdAtMs(o: FundingOpportunity): number {
  const t = o.created_at ? new Date(o.created_at).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Returns opportunities with score > 0, sorted by score desc, with a stable
 * tiebreak on created_at desc.
 */
export function matchOpportunities(
  p: Profile | null | undefined,
  opps: FundingOpportunity[],
): FundingOpportunity[] {
  if (!p || opps.length === 0) return [];

  return opps
    .map((o) => ({ o, score: scoreOpportunity(p, o) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || createdAtMs(b.o) - createdAtMs(a.o))
    .map((x) => x.o);
}
