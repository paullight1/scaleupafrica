import { describe, expect, it } from "vitest";
import {
  calculateFundingCertificationMetrics,
  evaluateFundingCertificationGate,
  type FundingCertificationObservation,
} from "./fundingCertification";

function good(id: string, overrides: Partial<FundingCertificationObservation> = {}): FundingCertificationObservation {
  return {
    id,
    predictedOpen: true,
    groundTruthOpen: true,
    confirmedDeadline: true,
    deadlineSourceBacked: true,
    predictedEligible: true,
    groundTruthEligible: true,
    discoverySource: "verified_feed",
    predictedVerified: true,
    statusFresh: true,
    rankingGroup: "g1",
    rank: Number(id.replace(/\D/g, "")) || 1,
    relevant: true,
    authoritativeLinkHealthy: true,
    ...overrides,
  };
}

const passing = [1, 2, 3, 4, 5].map((i) => good(`case-${i}`));

describe("funding accuracy certification", () => {
  it("passes a benchmark that clears all hard thresholds", () => {
    const result = evaluateFundingCertificationGate(passing);
    expect(result.pass).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.metrics.currentOpenPrecision).toBe(1);
    expect(result.metrics.confirmedDeadlineSourceCoverage).toBe(1);
    expect(result.metrics.hardEligibilityFalsePositiveRate).toBe(0);
    expect(result.metrics.precisionAt5).toBe(1);
    expect(result.metrics.aiPromotedCount).toBe(0);
    expect(result.metrics.staleOpenCount).toBe(0);
  });

  it("fails a false current-open prediction", () => {
    const result = evaluateFundingCertificationGate([
      ...passing,
      good("case-6", { groundTruthOpen: false, rank: null, rankingGroup: null }),
    ]);
    expect(result.pass).toBe(false);
    expect(result.failures).toContain("current_open_precision_below_98_percent");
  });

  it("fails any unsupported confirmed deadline", () => {
    const rows = passing.map((row, index) => index === 0 ? { ...row, deadlineSourceBacked: false } : row);
    expect(evaluateFundingCertificationGate(rows).failures).toContain(
      "confirmed_deadline_source_coverage_below_100_percent",
    );
  });

  it("requires hard eligibility false positives to stay strictly below two percent", () => {
    const rows = Array.from({ length: 50 }, (_, index) => good(`e-${index + 1}`, {
      rankingGroup: index < 5 ? "g1" : null,
      rank: index < 5 ? index + 1 : null,
      groundTruthEligible: index !== 0,
    }));
    expect(calculateFundingCertificationMetrics(rows).hardEligibilityFalsePositiveRate).toBe(0.02);
    expect(evaluateFundingCertificationGate(rows).failures).toContain(
      "hard_eligibility_false_positive_rate_not_below_2_percent",
    );
  });

  it("fails Precision@5 below eighty percent", () => {
    const rows = passing.map((row, index) => ({ ...row, relevant: index < 3 }));
    expect(evaluateFundingCertificationGate(rows).failures).toContain("precision_at_5_below_80_percent");
  });

  it("fails any AI discovery promoted to verified or open", () => {
    const rows = [...passing, good("ai-1", {
      discoverySource: "ai_assisted",
      rankingGroup: null,
      rank: null,
    })];
    expect(evaluateFundingCertificationGate(rows).failures).toContain(
      "ai_discovery_promoted_to_verified_or_open",
    );
  });

  it("fails stale OPEN leakage", () => {
    const rows = passing.map((row, index) => index === 0 ? { ...row, statusFresh: false } : row);
    expect(evaluateFundingCertificationGate(rows).failures).toContain("stale_open_record_in_primary_output");
  });

  it("fails broken authoritative link rate above one percent", () => {
    const rows = Array.from({ length: 50 }, (_, index) => good(`link-${index + 1}`, {
      rankingGroup: index < 5 ? "g1" : null,
      rank: index < 5 ? index + 1 : null,
      authoritativeLinkHealthy: index !== 0,
    }));
    expect(calculateFundingCertificationMetrics(rows).brokenAuthoritativeLinkRate).toBe(0.02);
    expect(evaluateFundingCertificationGate(rows).failures).toContain(
      "broken_authoritative_link_rate_above_1_percent",
    );
  });

  it("rejects an undersized benchmark that could game the gate", () => {
    const result = evaluateFundingCertificationGate([good("tiny", { rankingGroup: "g1", rank: 1 })]);
    expect(result.pass).toBe(false);
    expect(result.failures).toContain("benchmark_has_insufficient_top5_cases");
  });
});