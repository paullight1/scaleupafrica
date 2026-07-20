import { parseOpportunities, type Opportunity } from "@/lib/fundingSchema";

/**
 * localStorage layer for AI deep-search results. Lets a returning user see their
 * last results instantly on 3G before any network, and survives full reloads.
 * The TanStack Query cache holds them in-session; this + funding_results holds
 * them across sessions. Every operation is wrapped so quota / private-mode /
 * JSON errors are a silent no-op — never trust storage, always re-validate.
 *
 * Cleared from signOut in src/hooks/useAuth.tsx (coordinate with Plan 02).
 */

const KEY_PREFIX = "sua:funding:v1:";

export interface FundingCacheEntry {
  keywordsRaw: string;
  keywordsNormalized: string;
  opportunities: Opportunity[];
  generatedAt: string; // ISO
}

function keyFor(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

export function readFundingCache(userId: string): FundingCacheEntry | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FundingCacheEntry>;
    // Never trust storage: re-validate the payload through the schema.
    const opportunities = parseOpportunities(parsed.opportunities ?? []);
    if (!parsed.generatedAt || typeof parsed.keywordsRaw !== "string") return null;
    return {
      keywordsRaw: parsed.keywordsRaw,
      keywordsNormalized: parsed.keywordsNormalized ?? "",
      opportunities,
      generatedAt: parsed.generatedAt,
    };
  } catch {
    return null;
  }
}

export function writeFundingCache(userId: string, entry: FundingCacheEntry): void {
  if (!userId) return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(entry));
  } catch {
    /* quota / private mode — no-op */
  }
}

export function clearFundingCache(userId?: string): void {
  try {
    if (userId) {
      localStorage.removeItem(keyFor(userId));
      return;
    }
    // No id (e.g. signOut without a captured id): clear every funding entry.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX)) localStorage.removeItem(k);
    }
  } catch {
    /* no-op */
  }
}
