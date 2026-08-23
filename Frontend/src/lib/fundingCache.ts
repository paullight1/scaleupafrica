import { parseOpportunities, type Opportunity } from "@/lib/fundingSchema";
import { effectiveFundingVerificationStatus } from "@shared/lib/fundingTrust";
import { effectiveFundingStatus } from "@shared/lib/fundingStatus";

/**
 * localStorage layer for funding-search results. Cache schema v2 was introduced
 * with explicit provenance/current-cycle trust. Pre-v2 entries are ignored so a
 * legacy browser payload cannot preserve old "verified/open" presentation.
 */

const KEY_PREFIX = "sua:funding:v2:";
const LEGACY_KEY_PREFIX = "sua:funding:v1:";
const ANY_FUNDING_KEY_PREFIX = "sua:funding:v";

/**
 * Max age of a cached entry before it's treated as expired on read. Matches the
 * 7-day DB TTL on funding_results; without this the initialData seed (staleTime:
 * Infinity) would surface a stale entry indefinitely.
 */
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface FundingCacheEntry {
  keywordsRaw: string;
  keywordsNormalized: string;
  opportunities: Opportunity[];
  generatedAt: string;
}

function keyFor(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

function legacyKeyFor(userId: string): string {
  return `${LEGACY_KEY_PREFIX}${userId}`;
}

function normalizeApplicationStatus(value: unknown) {
  return value === "open" ||
    value === "closing_soon" ||
    value === "rolling" ||
    value === "upcoming" ||
    value === "closed" ||
    value === "paused"
    ? value
    : "unknown";
}

/**
 * Browser storage is untrusted. Unknown provenance is treated as AI discovery;
 * verified-feed records may only retain trust when their stored canonical state
 * and freshness still support it.
 */
function normalizeCachedOpportunity(opportunity: Opportunity): Opportunity {
  if (opportunity.discovery_source !== "verified_feed") {
    return {
      ...opportunity,
      discovery_source: "ai_assisted",
      verification_status: "unverified",
      source_checked_at: undefined,
      application_status: "unknown",
      status_checked_at: undefined,
      status_evidence_url: null,
      opens_at: undefined,
      deadline_at: undefined,
      deadline_timezone: undefined,
      deadline_status: "unknown",
      current_cycle_label: undefined,
      application_url: null,
    };
  }

  const verification = effectiveFundingVerificationStatus(
    opportunity.verification_status,
    opportunity.status_evidence_url ?? opportunity.url,
    opportunity.source_checked_at,
  );
  const application = verification === "verified"
    ? effectiveFundingStatus(
      normalizeApplicationStatus(opportunity.application_status),
      opportunity.status_checked_at,
    )
    : "unknown";

  return {
    ...opportunity,
    verification_status: verification,
    application_status: application,
  };
}

export function readFundingCache(userId: string): FundingCacheEntry | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FundingCacheEntry>;
    if (!parsed.generatedAt || typeof parsed.keywordsRaw !== "string") return null;

    const generatedAtMs = Date.parse(parsed.generatedAt);
    if (!Number.isFinite(generatedAtMs) || Date.now() - generatedAtMs > CACHE_TTL_MS) {
      localStorage.removeItem(keyFor(userId));
      return null;
    }

    const opportunities = parseOpportunities(parsed.opportunities ?? [])
      .map(normalizeCachedOpportunity);
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
    // Best-effort retirement of the old schema for this user.
    localStorage.removeItem(legacyKeyFor(userId));
  } catch {
    /* quota / private mode — no-op */
  }
}

export function clearFundingCache(userId?: string): void {
  try {
    if (userId) {
      localStorage.removeItem(keyFor(userId));
      localStorage.removeItem(legacyKeyFor(userId));
      return;
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(ANY_FUNDING_KEY_PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    /* no-op */
  }
}
