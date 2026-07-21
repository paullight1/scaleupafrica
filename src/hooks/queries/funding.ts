import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  normalizeKeywords,
  parseOpportunities,
  type Opportunity,
} from "@/lib/fundingSchema";
import {
  readFundingCache,
  writeFundingCache,
  CACHE_TTL_MS,
  type FundingCacheEntry,
} from "@/lib/fundingCache";
import { useApiFor } from "@/lib/api/flags";
import { ApiError } from "@/lib/api/client";
import { searchFunding, getLatestFunding, listCuratedFunding } from "@/lib/api/funding";

// funding_results and the new funding_opportunities columns (details, source,
// last_verified_at) are added by 20260720140000_funding_feed_cache.sql. types.ts
// is regenerated against the DB post-migration (a human step, HANDOFF). Until then
// we read them through an untyped view so tsc stays green WITHOUT hand-editing the
// shared generated types file (3 sibling Wave-3 waves also depend on it).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untyped = supabase as unknown as { from: (table: string) => any };

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export type FundingErrorCode =
  | "rate_limited"
  | "subscription_required"
  | "timeout"
  | "invalid_ai_output"
  | "unauthorized"
  | "unknown";

export class FundingError extends Error {
  code: FundingErrorCode;
  constructor(code: FundingErrorCode) {
    super(fundingErrorMessage(code));
    this.name = "FundingError";
    this.code = code;
  }
}

/** Map a NestJS API error code onto the funding UI's error vocabulary. */
function apiCodeToFundingCode(code: string): FundingErrorCode {
  switch (code) {
    case "SUBSCRIPTION_REQUIRED":
      return "subscription_required";
    case "RATE_LIMITED":
      return "rate_limited";
    case "TIMEOUT":
      return "timeout";
    case "UPSTREAM_ERROR":
      return "invalid_ai_output";
    case "UNAUTHENTICATED":
      return "unauthorized";
    default:
      return "unknown";
  }
}

export function fundingErrorMessage(code: FundingErrorCode): string {
  switch (code) {
    case "rate_limited":
      return "You've run several searches recently. Please try again in about an hour — your previous results are saved.";
    case "subscription_required":
      return "Your membership isn't active right now. Please renew to run a search.";
    case "timeout":
      return "That search took longer than expected. Please try again.";
    case "invalid_ai_output":
      return "We couldn't read those results. Please try again in a moment.";
    case "unauthorized":
      return "Your session expired. Please sign in again.";
    default:
      return "Something went wrong fetching opportunities. Please try again.";
  }
}

// ---------------------------------------------------------------------------
// Deep-search result (per-user AI cache)
// ---------------------------------------------------------------------------
export interface FundingResult {
  opportunities: Opportunity[];
  keywordsRaw: string;
  generatedAt: string;
  cached: boolean;
}

export function fundingResultKey(userId: string | undefined) {
  return ["funding", "result", userId] as const;
}

/** Most-recent unexpired funding_results row; seeded instantly from localStorage. */
export function useFundingResult() {
  const { user } = useAuth();
  const userId = user?.id;
  const viaApi = useApiFor("funding");

  const seed = userId ? readFundingCache(userId) : null;
  const initialData: FundingResult | undefined = seed
    ? { opportunities: seed.opportunities, keywordsRaw: seed.keywordsRaw, generatedAt: seed.generatedAt, cached: true }
    : undefined;

  return useQuery<FundingResult | null>({
    queryKey: fundingResultKey(userId),
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    initialData,
    queryFn: async () => {
      if (viaApi) {
        const res = await getLatestFunding();
        if (!res) return null;
        return {
          opportunities: parseOpportunities(res.opportunities),
          keywordsRaw: res.keywordsRaw ?? "",
          generatedAt: res.generatedAt,
          cached: true,
        };
      }
      const { data, error } = await untyped
        .from("funding_results")
        .select("keywords_raw, opportunities, created_at, expires_at")
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        opportunities: parseOpportunities(data.opportunities),
        keywordsRaw: data.keywords_raw ?? "",
        generatedAt: data.created_at,
        cached: true,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Generate (AI deep search) — cached & rate-limited server-side
// ---------------------------------------------------------------------------
interface GenerateResponse {
  opportunities?: unknown;
  cached?: boolean;
  generated_at?: string;
  error?: FundingErrorCode;
}

const CLIENT_TIMEOUT_MS = 90_000;

export function useGenerateFunding() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const viaApi = useApiFor("funding");

  return useMutation<FundingResult, FundingError, string>({
    mutationFn: async (rawKeywords: string) => {
      // Double-submit guard (belt-and-braces with the UI's isPending disable).
      if (inFlight.current) throw new FundingError("unknown");
      inFlight.current = true;
      try {
        const keywords = rawKeywords.trim() || "African SMEs";

        if (viaApi) {
          try {
            const res = await searchFunding(keywords);
            return {
              opportunities: parseOpportunities(res.opportunities),
              keywordsRaw: res.keywordsRaw || keywords,
              generatedAt: res.generatedAt ?? new Date().toISOString(),
              cached: !!res.cached,
            };
          } catch (e) {
            if (e instanceof ApiError) throw new FundingError(apiCodeToFundingCode(e.code));
            throw new FundingError("unknown");
          }
        }

        const invoke = supabase.functions
          .invoke<GenerateResponse>("aggregate-funding", { body: { keywords } })
          .then(async ({ data, error }) => {
            if (error) {
              // Non-2xx: pull the structured { error } code from the response body.
              let code: FundingErrorCode = "unknown";
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const ctx = (error as any).context;
                if (ctx && typeof ctx.json === "function") {
                  const body = await ctx.json();
                  if (body?.error) code = body.error as FundingErrorCode;
                }
              } catch {
                /* keep "unknown" */
              }
              throw new FundingError(code);
            }
            return data as GenerateResponse;
          });

        // supabase-js invoke() has no AbortSignal; race a hard client-side stop.
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new FundingError("timeout")), CLIENT_TIMEOUT_MS),
        );
        const data = await Promise.race([invoke, timeout]);

        // Never render raw model output — validate client-side too.
        const opportunities = parseOpportunities(data.opportunities ?? []);
        return {
          opportunities,
          keywordsRaw: keywords,
          generatedAt: data.generated_at ?? new Date().toISOString(),
          cached: !!data.cached,
        };
      } finally {
        inFlight.current = false;
      }
    },
    onSuccess: (result) => {
      if (!userId) return;
      queryClient.setQueryData<FundingResult>(fundingResultKey(userId), result);
      const entry: FundingCacheEntry = {
        keywordsRaw: result.keywordsRaw,
        keywordsNormalized: normalizeKeywords(result.keywordsRaw),
        opportunities: result.opportunities,
        generatedAt: result.generatedAt,
      };
      writeFundingCache(userId, entry);
    },
  });
}

// ---------------------------------------------------------------------------
// Shared weekly feed (primary experience)
// ---------------------------------------------------------------------------
export interface FeedItem extends Opportunity {
  id: string;
  lastVerifiedAt: string | null;
  featured: boolean;
}

/** Published, member-gated funding_opportunities mapped through the Opportunity schema. */
export function useFundingFeed() {
  const { user } = useAuth();
  const viaApi = useApiFor("funding");

  return useQuery<FeedItem[]>({
    queryKey: ["funding", "feed"],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (viaApi) {
        const rows = await listCuratedFunding();
        const out: FeedItem[] = [];
        for (const row of rows) {
          const details = (row.details && typeof row.details === "object" ? row.details : {}) as Record<string, unknown>;
          const merged = {
            ...details,
            title: row.title,
            funder: row.funder,
            type: row.type ?? undefined,
            summary: row.summary ?? "",
            amount: row.amount ?? "",
            opens: row.opens ?? "",
            deadline: row.deadline ?? "",
            eligibility: row.eligibility ?? "",
            url: row.url ?? "",
            tags: Array.isArray(row.tags) ? row.tags : [],
          };
          const [op] = parseOpportunities([merged]);
          if (op) out.push({ ...op, id: row.id, lastVerifiedAt: row.lastVerifiedAt ?? null, featured: !!row.featured });
        }
        return out;
      }
      const { data, error } = await untyped
        .from("funding_opportunities")
        .select(
          "id, title, funder, type, summary, amount, opens, deadline, eligibility, url, tags, details, featured, last_verified_at",
        )
        .eq("status", "published")
        .order("featured", { ascending: false })
        .order("last_verified_at", { ascending: false, nullsFirst: false });
      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      const out: FeedItem[] = [];
      for (const row of rows) {
        const details = (row.details && typeof row.details === "object" ? row.details : {}) as Record<string, unknown>;
        const merged = {
          ...details,
          title: row.title,
          funder: row.funder,
          type: row.type ?? undefined,
          summary: row.summary ?? "",
          amount: row.amount ?? "",
          opens: row.opens ?? "",
          deadline: row.deadline ?? "",
          eligibility: row.eligibility ?? "",
          url: row.url ?? "",
          tags: Array.isArray(row.tags) ? row.tags : [],
        };
        const [op] = parseOpportunities([merged]);
        if (op) {
          out.push({ ...op, id: row.id, lastVerifiedAt: row.last_verified_at ?? null, featured: !!row.featured });
        }
      }
      return out;
    },
  });
}

// ---------------------------------------------------------------------------
// Own profile (for keyword suggestion chips) — non-fatal for /funding
// ---------------------------------------------------------------------------
export interface FundingProfile {
  business_name: string | null;
  sector: string | null;
  country: string | null;
  keywords: string[] | null;
}

export function useFundingProfile() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery<FundingProfile | null>({
    queryKey: ["funding", "profile", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("business_name, sector, country, keywords")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as FundingProfile) ?? null;
    },
  });
}

/** Build up-to-6 deduped keyword chips from the member's profile, with fallbacks. */
export function buildKeywordChips(profile: FundingProfile | null | undefined): string[] {
  const fallback = ["agriculture Nigeria", "women-led fintech", "climate grant Africa", "tech fellowship"];
  if (!profile) return fallback;
  const { sector, country, keywords } = profile;
  const chips: string[] = [];
  if (sector && country) chips.push(`${sector} ${country}`);
  if (sector) chips.push(`${sector} grant`);
  if (country) chips.push(`SME accelerator ${country}`);
  if (Array.isArray(keywords)) chips.push(...keywords.filter(Boolean).slice(0, 3));
  const deduped = Array.from(new Set(chips.map((c) => c.trim()).filter(Boolean)));
  return (deduped.length ? deduped : fallback).slice(0, 6);
}

export const _internal = { CACHE_TTL_MS };
