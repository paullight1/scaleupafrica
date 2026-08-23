import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { and, count, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { DB, type Db } from "../db/client";
import {
  fundingOpportunities,
  fundingResults,
  type FundingOpportunityRow,
} from "../db/schema";
import {
  fundingOpportunityStatus,
  type FundingOpportunityStatusRow,
} from "../db/funding-intelligence-schema";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { RolesService } from "../auth/roles.service";
import { AiGatewayService, GatewayError } from "./ai-gateway.service";
import { ENV, type Env } from "../config/env";
import type { AppRoleName } from "../auth/types";
import {
  normalizeKeywords,
  parseOpportunities,
  type ApplicationStatus,
  type CuratedOpportunity,
  type DeadlineStatus,
  type FundingSearchResult,
  type Opportunity,
  type VerificationStatus,
} from "../contracts";
import { effectiveFundingStatus } from "../../../Shared/src/lib/fundingStatus";
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
        opportunities: normalizeCachedTrust(parseOpportunities(cached.opportunities), now),
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
    const statusById = await this.loadStatusById(curatedRows.map((row) => row.id));

    const candidates = curatedRows
      .map((row) => toSearchCandidate(row, statusById.get(row.id) ?? null, keywordsRaw, now))
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
        return { opportunities: verifiedOpportunities, cached: false, generatedAt: now.toISOString(), keywordsRaw };
      }
      throw new HttpException(
        {
          error: {
            code: "RATE_LIMITED",
            message: "You've run several AI-assisted searches recently. Please try again in about an hour — your previous results are saved.",
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let aiOpportunities: Opportunity[];
    try {
      aiOpportunities = normalizeAiTrust(await this.ai.curate(keywordsRaw));
    } catch (e) {
      if (verifiedOpportunities.length > 0) {
        this.logger.warn("AI funding discovery failed; returning verified matches only");
        return { opportunities: verifiedOpportunities, cached: false, generatedAt: now.toISOString(), keywordsRaw };
      }
      throw mapGatewayError(e);
    }

    const opportunities = dedupeFundingSearchResults(verifiedOpportunities, aiOpportunities).slice(0, 15);

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
    const now = new Date();
    const [row] = await this.db
      .select({
        opportunities: fundingResults.opportunities,
        keywordsRaw: fundingResults.keywordsRaw,
        createdAt: fundingResults.createdAt,
      })
      .from(fundingResults)
      .where(and(eq(fundingResults.userId, userId), gt(fundingResults.expiresAt, now)))
      .orderBy(desc(fundingResults.createdAt))
      .limit(1);
    if (!row) return null;
    return {
      opportunities: normalizeCachedTrust(parseOpportunities(row.opportunities), now),
      cached: true,
      generatedAt: iso(row.createdAt),
      keywordsRaw: row.keywordsRaw ?? "",
    };
  }

  async curatedList(userId: string): Promise<CuratedOpportunity[]> {
    await this.assertMemberOrStaff(userId);
    const now = new Date();
    const rows = await this.db
      .select()
      .from(fundingOpportunities)
      .where(eq(fundingOpportunities.status, "published"))
      .orderBy(desc(fundingOpportunities.featured), desc(fundingOpportunities.lastVerifiedAt))
      .limit(100);
    const statusById = await this.loadStatusById(rows.map((row) => row.id));

    return rows.map((r) => {
      const status = statusById.get(r.id) ?? null;
      const lastVerifiedAt = r.lastVerifiedAt ? iso(r.lastVerifiedAt) : null;
      const verification = verificationState(status?.sourceUrl ?? null, lastVerifiedAt, status?.verificationStatus, now);
      const application = verification === "verified"
        ? effectiveApplicationStatus(status?.applicationStatus, status?.statusCheckedAt, now)
        : "unknown";
      return {
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
        lastVerifiedAt,
        sourceUrl: status?.sourceUrl ?? null,
        sourceName: status?.sourceName ?? null,
        verificationStatus: verification,
        details: (r.details && typeof r.details === "object" ? r.details : {}) as Record<string, unknown>,
        applicationStatus: application,
        statusCheckedAt: nullableIso(status?.statusCheckedAt),
        statusEvidenceUrl: status?.statusEvidenceUrl ?? null,
        opensAt: nullableIso(status?.opensAt),
        deadlineAt: nullableIso(status?.deadlineAt),
        deadlineTimezone: status?.deadlineTimezone ?? null,
        deadlineStatus: normalizeDeadlineStatus(status?.deadlineStatus),
        currentCycleLabel: status?.currentCycleLabel ?? null,
        applicationUrl: status?.applicationUrl ?? null,
      };
    });
  }

  private async loadStatusById(ids: string[]): Promise<Map<string, FundingOpportunityStatusRow>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db
      .select()
      .from(fundingOpportunityStatus)
      .where(inArray(fundingOpportunityStatus.id, ids))
      .limit(Math.max(ids.length, 1));
    return new Map(rows.map((row) => [String(row.id), row]));
  }
}

function normalizeAiTrust(items: Opportunity[]): Opportunity[] {
  return items.map((opportunity) => ({
    ...opportunity,
    discovery_source: "ai_assisted" as const,
    verification_status: "unverified" as const,
    source_checked_at: undefined,
    application_status: "unknown" as const,
    status_checked_at: undefined,
    status_evidence_url: null,
    opens_at: undefined,
    deadline_at: undefined,
    deadline_timezone: undefined,
    deadline_status: "unknown" as const,
    current_cycle_label: undefined,
    application_url: null,
  }));
}

function normalizeCachedTrust(opportunities: Opportunity[], now: Date): Opportunity[] {
  return opportunities.map((opportunity) => {
    if (opportunity.discovery_source !== "verified_feed") return normalizeAiTrust([opportunity])[0];
    const verification = cachedVerificationState(opportunity, now);
    const application = verification === "verified"
      ? effectiveApplicationStatus(opportunity.application_status, opportunity.status_checked_at, now)
      : "unknown";
    return {
      ...opportunity,
      verification_status: verification,
      application_status: application,
    };
  });
}

function cachedVerificationState(opportunity: Opportunity, now: Date): VerificationStatus {
  const checkedAt = opportunity.source_checked_at ?? null;
  const sourceEvidence = opportunity.status_evidence_url ?? opportunity.url ?? null;
  return verificationState(sourceEvidence, checkedAt, opportunity.verification_status, now);
}

function toSearchCandidate(
  row: FundingOpportunityRow,
  status: FundingOpportunityStatusRow | null,
  query: string,
  now: Date,
): RankedCuratedCandidate | null {
  const lastVerifiedAt = row.lastVerifiedAt ? iso(row.lastVerifiedAt) : null;
  const countryFocus = row.countryFocus ?? [];
  const details = row.details && typeof row.details === "object" ? row.details as Record<string, unknown> : {};
  const verification = verificationState(status?.sourceUrl ?? null, lastVerifiedAt, status?.verificationStatus, now);
  const application = verification === "verified"
    ? effectiveApplicationStatus(status?.applicationStatus, status?.statusCheckedAt, now)
    : "unknown";

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
      verification_status: verification,
      source_checked_at: lastVerifiedAt ?? undefined,
      application_status: application,
      status_checked_at: nullableIso(status?.statusCheckedAt) ?? undefined,
      status_evidence_url: status?.statusEvidenceUrl ?? null,
      opens_at: nullableIso(status?.opensAt) ?? undefined,
      deadline_at: nullableIso(status?.deadlineAt) ?? undefined,
      deadline_timezone: status?.deadlineTimezone ?? undefined,
      deadline_status: normalizeDeadlineStatus(status?.deadlineStatus),
      current_cycle_label: status?.currentCycleLabel ?? undefined,
      application_url: status?.applicationUrl ?? null,
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
  opportunity = { ...opportunity, match_reasons: fundingSearchReasons(query, searchable) };
  return { ...searchable, opportunity };
}

function verificationState(
  sourceUrl: string | null,
  checkedAt: string | null,
  stored: unknown,
  now: Date,
): VerificationStatus {
  if (!sourceUrl || !checkedAt) return "unverified";
  const checked = new Date(checkedAt).getTime();
  if (Number.isNaN(checked)) return "unverified";
  if (stored !== "verified" && stored !== "stale") return "unverified";
  const ageDays = Math.max(0, (now.getTime() - checked) / 86_400_000);
  return ageDays <= 7 && stored === "verified" ? "verified" : "stale";
}

function effectiveApplicationStatus(
  stored: unknown,
  checkedAt: Date | string | null | undefined,
  now: Date,
): ApplicationStatus {
  const status = normalizeApplicationStatus(stored);
  return effectiveFundingStatus(status, checkedAt, now);
}

function normalizeApplicationStatus(value: unknown): ApplicationStatus {
  return value === "open" || value === "closing_soon" || value === "rolling" || value === "upcoming" || value === "closed" || value === "paused"
    ? value
    : "unknown";
}

function normalizeDeadlineStatus(value: unknown): DeadlineStatus {
  return value === "confirmed" || value === "rolling" ? value : "unknown";
}

function nullableIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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