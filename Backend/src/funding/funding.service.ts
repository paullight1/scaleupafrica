import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import { DB, type Db } from "../db/client";
import {
  fundingOpportunities,
  fundingResults,
  type FundingOpportunityRow,
} from "../db/schema";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { RolesService } from "../auth/roles.service";
import { AiGatewayService, GatewayError } from "./ai-gateway.service";
import { ENV, type Env } from "../config/env";
import type { AppRoleName } from "../auth/types";
import {
  normalizeKeywords,
  parseOpportunities,
  type CuratedOpportunity,
  type FundingSearchResult,
  type Opportunity,
} from "../contracts";
import {
  dedupeFundingSearchResults,
  fundingSearchReasons,
  rankFundingSearch,
  type SearchableFundingOpportunity,
} from "./search-ranking";

const RATE_LIMIT_PER_HOUR = 3;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const VERIFIED_RESULT_TARGET = 5;
const VERIFIED_SCAN_LIMIT = 100;
const STAFF_ROLES: AppRoleName[] = ["admin", "editor"];

interface RankedCuratedCandidate extends SearchableFundingOpportunity {
  opportunity: Opportunity;
}

@Injectable()
export class FundingService {
  private readonly logger = new Logger("Funding");

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ENV) private readonly env: Env,
    private readonly subs: SubscriptionsService,
    private readonly roles: RolesService,
    private readonly ai: AiGatewayService,
  ) {}

  private assertActive = async (userId: string): Promise<void> => {
    if (!(await this.subs.isActiveForUser(userId))) {
      throw new ForbiddenException({
        error: {
          code: "SUBSCRIPTION_REQUIRED",
          message: "Your membership isn't active right now. Please renew to run a search.",
        },
      });
    }
  };

  private assertMemberOrStaff = async (userId: string): Promise<void> => {
    if (await this.subs.isActiveForUser(userId)) return;
    if (await this.roles.hasAny(userId, STAFF_ROLES)) return;
    throw new ForbiddenException({
      error: {
        code: "SUBSCRIPTION_REQUIRED",
        message: "Your membership isn't active right now. Please renew to view funding opportunities.",
      },
    });
  };

  /**
   * POST /funding/search — verified-first search with AI only as long-tail fallback.
   * Curated-only results do not touch funding_results because that table is also
   * the current AI quota ledger; cheap verified search must not consume AI quota.
   */
  async search(userId: string, rawKeywords: string): Promise<FundingSearchResult> {
    await this.assertActive(userId);

    const keywordsRaw = (rawKeywords || "").trim().slice(0, 200) || "African SMEs";
    const keywordsNormalized = normalizeKeywords(keywordsRaw);
    const now = new Date();

    const [cached] = await this.db
      .select({ opportunities: fundingResults.opportunities, createdAt: fundingResults.createdAt })
      .from(fundingResults)
      .where(
        and(
          eq(fundingResults.userId, userId),
          eq(fundingResults.keywordsNormalized, keywordsNormalized),
          gt(fundingResults.expiresAt, now),
        ),
      )
      .limit(1);
    if (cached) {
      return {
        opportunities: normalizeCachedTrust(parseOpportunities(cached.opportunities)),
        cached: true,
        generatedAt: iso(cached.createdAt),
        keywordsRaw,
      };
    }

    const curatedRows = await this.db
      .select()
      .from(fundingOpportunities)
      .where(eq(fundingOpportunities.status, "published"))
      .orderBy(desc(fundingOpportunities.featured), desc(fundingOpportunities.lastVerifiedAt))
      .limit(VERIFIED_SCAN_LIMIT);

    const candidates = curatedRows
      .map((row) => toSearchCandidate(row, keywordsRaw, now))
      .filter((candidate): candidate is RankedCuratedCandidate => candidate !== null);
    const verifiedOpportunities = rankFundingSearch(keywordsRaw, candidates, 12).map(
      (candidate) => candidate.opportunity,
    );

    if (verifiedOpportunities.length >= VERIFIED_RESULT_TARGET) {
      return {
        opportunities: verifiedOpportunities,
        cached: false,
        generatedAt: now.toISOString(),
        keywordsRaw,
      };
    }

    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const [{ n }] = await this.db
      .select({ n: count() })
      .from(fundingResults)
      .where(and(eq(fundingResults.userId, userId), gt(fundingResults.createdAt, hourAgo)));
    if (Number(n) >= RATE_LIMIT_PER_HOUR) {
      if (verifiedOpportunities.length > 0) {
        return {
          opportunities: verifiedOpportunities,
          cached: false,
          generatedAt: now.toISOString(),
          keywordsRaw,
        };
      }
      throw new HttpException(
        {
          error: {
            code: "RATE_LIMITED",
            message:
              "You've run several AI-assisted searches recently. Please try again in about an hour — your previous results are saved.",
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let aiOpportunities: Opportunity[];
    try {
      aiOpportunities = await this.ai.curate(keywordsRaw);
    } catch (e) {
      if (verifiedOpportunities.length > 0) {
        this.logger.warn("AI funding discovery failed; returning verified matches only");
        return {
          opportunities: verifiedOpportunities,
          cached: false,
          generatedAt: now.toISOString(),
          keywordsRaw,
        };
      }
      throw mapGatewayError(e);
    }

    const opportunities = dedupeFundingSearchResults(
      verifiedOpportunities,
      aiOpportunities,
    ).slice(0, 15);

    await this.db
      .delete(fundingResults)
      .where(and(eq(fundingResults.userId, userId), sql`${fundingResults.expiresAt} < ${now}`))
      .catch(() => undefined);

    const generatedAt = new Date();
    await this.db
      .insert(fundingResults)
      .values({
        userId,
        keywordsNormalized,
        keywordsRaw,
        opportunities,
        model: this.env.AI_MODEL,
        createdAt: generatedAt,
        expiresAt: new Date(generatedAt.getTime() + CACHE_TTL_MS),
      })
      .onConflictDoUpdate({
        target: [fundingResults.userId, fundingResults.keywordsNormalized],
        set: {
          keywordsRaw,
          opportunities,
          model: this.env.AI_MODEL,
          createdAt: generatedAt,
          expiresAt: new Date(generatedAt.getTime() + CACHE_TTL_MS),
        },
      });

    return { opportunities, cached: false, generatedAt: generatedAt.toISOString(), keywordsRaw };
  }

  async latest(userId: string): Promise<FundingSearchResult | null> {
    await this.assertActive(userId);
    const [row] = await this.db
      .select({
        opportunities: fundingResults.opportunities,
        keywordsRaw: fundingResults.keywordsRaw,
        createdAt: fundingResults.createdAt,
      })
      .from(fundingResults)
      .where(and(eq(fundingResults.userId, userId), gt(fundingResults.expiresAt, new Date())))
      .orderBy(desc(fundingResults.createdAt))
      .limit(1);
    if (!row) return null;
    return {
      opportunities: normalizeCachedTrust(parseOpportunities(row.opportunities)),
      cached: true,
      generatedAt: iso(row.createdAt),
      keywordsRaw: row.keywordsRaw ?? "",
    };
  }

  async curatedList(userId: string): Promise<CuratedOpportunity[]> {
    await this.assertMemberOrStaff(userId);
    const rows = await this.db
      .select()
      .from(fundingOpportunities)
      .where(eq(fundingOpportunities.status, "published"))
      .orderBy(desc(fundingOpportunities.featured), desc(fundingOpportunities.lastVerifiedAt))
      .limit(100);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      funder: r.funder,
      type: r.type,
      summary: r.summary,
      amount: r.amount,
      opens: r.opens,
      deadline: r.deadline,
      eligibility: r.eligibility,
      url: r.url,
      tags: r.tags ?? [],
      countryFocus: r.countryFocus ?? [],
      featured: r.featured,
      lastVerifiedAt: r.lastVerifiedAt ? iso(r.lastVerifiedAt) : null,
      details: (r.details && typeof r.details === "object" ? r.details : {}) as Record<string, unknown>,
    }));
  }
}

function normalizeCachedTrust(opportunities: Opportunity[]): Opportunity[] {
  return opportunities.map((opportunity) =>
    opportunity.discovery_source
      ? opportunity
      : {
          ...opportunity,
          discovery_source: "ai_assisted" as const,
          verification_status: "unverified" as const,
          source_checked_at: undefined,
        },
  );
}

function toSearchCandidate(
  row: FundingOpportunityRow,
  query: string,
  now: Date,
): RankedCuratedCandidate | null {
  const lastVerifiedAt = row.lastVerifiedAt ? iso(row.lastVerifiedAt) : null;
  const countryFocus = row.countryFocus ?? [];
  const details = row.details && typeof row.details === "object"
    ? row.details as Record<string, unknown>
    : {};

  let opportunity: Opportunity;
  try {
    const [parsed] = parseOpportunities([{
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
      tags: row.tags ?? [],
    }]);
    if (!parsed) return null;
    opportunity = {
      ...parsed,
      discovery_source: "verified_feed",
      verification_status: verificationStatus(lastVerifiedAt, parsed.url, now),
      source_checked_at: lastVerifiedAt ?? undefined,
      match_reasons: [],
    };
  } catch {
    return null;
  }

  const searchable: SearchableFundingOpportunity = {
    title: opportunity.title,
    funder: opportunity.funder,
    type: opportunity.type,
    summary: opportunity.summary,
    eligibility: opportunity.eligibility,
    tags: opportunity.tags,
    countryFocus,
    url: opportunity.url,
  };

  opportunity = {
    ...opportunity,
    match_reasons: fundingSearchReasons(query, searchable),
  };

  return { ...searchable, opportunity };
}

function verificationStatus(
  lastVerifiedAt: string | null,
  programUrl: string | null | undefined,
  now: Date,
): "verified" | "stale" | "unverified" {
  if (!programUrl || !lastVerifiedAt) return "unverified";
  const checked = new Date(lastVerifiedAt).getTime();
  if (Number.isNaN(checked)) return "unverified";
  const ageDays = Math.max(0, (now.getTime() - checked) / 86_400_000);
  return ageDays <= 7 ? "verified" : "stale";
}

function iso(v: Date | string | null): string {
  if (!v) return "";
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

function mapGatewayError(e: unknown): HttpException {
  const code = e instanceof GatewayError ? e.code : "unavailable";
  switch (code) {
    case "rate_limited":
      return new HttpException(
        { error: { code: "RATE_LIMITED", message: "The AI discovery service is busy. Please try again shortly." } },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    case "timeout":
      return new HttpException(
        { error: { code: "TIMEOUT", message: "That search took longer than expected. Please try again." } },
        HttpStatus.GATEWAY_TIMEOUT,
      );
    default:
      return new HttpException(
        { error: { code: "UPSTREAM_ERROR", message: "We couldn't read those results. Please try again in a moment." } },
        HttpStatus.BAD_GATEWAY,
      );
  }
}
