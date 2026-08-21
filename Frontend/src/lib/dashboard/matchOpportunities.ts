import {
  rankRecommendations,
  recommendOpportunity,
  type RecommendationOpportunity,
  type RecommendationProfile,
  type RecommendationResult,
} from "@/lib/funding/recommendationEngine";
import type { FundingOpportunity, Profile } from "./types";

export type FundingRecommendation = RecommendationResult<FundingOpportunity>;

function recommendationProfile(profile: Profile): RecommendationProfile {
  return {
    country: profile.country,
    sector: profile.sector,
    keywords: profile.keywords,
    shortDescription: profile.short_description,
    longDescription: profile.long_description,
  };
}

function recommendationOpportunity(opportunity: FundingOpportunity): RecommendationOpportunity {
  return {
    id: opportunity.id,
    title: opportunity.title,
    funder: opportunity.funder,
    type: opportunity.type,
    summary: opportunity.summary,
    eligibility: opportunity.eligibility,
    url: opportunity.url,
    deadline: opportunity.deadline,
    tags: opportunity.tags,
    countryFocus: opportunity.country_focus,
    featured: opportunity.featured,
    lastVerifiedAt: opportunity.last_verified_at,
    details:
      opportunity.details && typeof opportunity.details === "object" && !Array.isArray(opportunity.details)
        ? (opportunity.details as Record<string, unknown>)
        : null,
  };
}

export function recommendFundingOpportunity(
  profile: Profile,
  opportunity: FundingOpportunity,
  now = new Date(),
): FundingRecommendation {
  const result = recommendOpportunity(
    recommendationProfile(profile),
    recommendationOpportunity(opportunity),
    now,
  );
  return { ...result, opportunity };
}

/** Compatibility score for callers/tests that only need the numeric fit. */
export function scoreOpportunity(profile: Profile, opportunity: FundingOpportunity): number {
  return recommendFundingOpportunity(profile, opportunity).matchScore;
}

/**
 * Full explainable recommendation results for dashboard/Funding Radar surfaces.
 * Hard-ineligible opportunities are excluded by the core engine.
 */
export function recommendFundingOpportunities(
  profile: Profile | null | undefined,
  opportunities: FundingOpportunity[],
  now = new Date(),
): FundingRecommendation[] {
  if (!profile || opportunities.length === 0) return [];

  const byId = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity]));
  return rankRecommendations(
    recommendationProfile(profile),
    opportunities.map(recommendationOpportunity),
    now,
  ).map((result) => ({
    ...result,
    opportunity: byId.get(result.opportunity.id ?? "")!,
  }));
}

/** Existing dashboard compatibility: return only the ranked opportunity rows. */
export function matchOpportunities(
  profile: Profile | null | undefined,
  opportunities: FundingOpportunity[],
): FundingOpportunity[] {
  return recommendFundingOpportunities(profile, opportunities).map((result) => result.opportunity);
}
