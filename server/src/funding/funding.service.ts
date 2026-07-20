import {
  Injectable,
  Inject,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { and, eq, gt, desc, count, sql } from "drizzle-orm";
import { DB, type Db } from "../db/client";
import { fundingResults, fundingOpportunities } from "../db/schema";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { AiGatewayService, GatewayError } from "./ai-gateway.service";
import { ENV, type Env } from "../config/env";
import {
  normalizeKeywords,
  parseOpportunities,
  type FundingSearchResult,
  type CuratedOpportunity,
  type Opportunity,
} from "../contracts";

const RATE_LIMIT_PER_HOUR = 3;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class FundingService {
  private readonly logger = new Logger("Funding");
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ENV) private readonly env: Env,
    private readonly subs: SubscriptionsService,
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

  /** POST /funding/search — absorbs the aggregate-funding edge function. */
  async search(userId: string, rawKeywords: string): Promise<FundingSearchResult> {
    await this.assertActive(userId);

    const keywordsRaw = (rawKeywords || "").trim().slice(0, 200) || "African SMEs";
    const keywordsNormalized = normalizeKeywords(keywordsRaw);
    const now = new Date();

    // Cache hit => return immediately (no model call, no bill).
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
        opportunities: parseOpportunities(cached.opportunities),
        cached: true,
        generatedAt: iso(cached.createdAt),
        keywordsRaw,
      };
    }

    // Rate limit — cache hits above never reach this, so repeats are always free.
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const [{ n }] = await this.db
      .select({ n: count() })
      .from(fundingResults)
      .where(and(eq(fundingResults.userId, userId), gt(fundingResults.createdAt, hourAgo)));
    if (Number(n) >= RATE_LIMIT_PER_HOUR) {
      throw new HttpException(
        {
          error: {
            code: "RATE_LIMITED",
            message:
              "You've run several searches recently. Please try again in about an hour — your previous results are saved.",
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Gateway call -> validated/sanitized opportunities.
    let opportunities: Opportunity[];
    try {
      opportunities = await this.ai.curate(keywordsRaw);
    } catch (e) {
      throw mapGatewayError(e);
    }

    // Opportunistic cleanup + cache upsert (7-day TTL, matches funding_results default).
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

  /** GET /funding/latest — most recent unexpired cached result (or null). */
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
      opportunities: parseOpportunities(row.opportunities),
      cached: true,
      generatedAt: iso(row.createdAt),
      keywordsRaw: row.keywordsRaw ?? "",
    };
  }

  /** GET /funding/opportunities — admin-curated published feed (public). */
  async curatedList(): Promise<CuratedOpportunity[]> {
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

function iso(v: Date | string | null): string {
  if (!v) return "";
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

function mapGatewayError(e: unknown): HttpException {
  const code = e instanceof GatewayError ? e.code : "unavailable";
  switch (code) {
    case "rate_limited":
      return new HttpException(
        { error: { code: "RATE_LIMITED", message: "The AI service is busy. Please try again shortly." } },
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
