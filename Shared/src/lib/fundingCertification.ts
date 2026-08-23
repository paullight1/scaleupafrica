export interface FundingCertificationObservation {
  id: string;
  predictedOpen: boolean;
  groundTruthOpen: boolean;
  confirmedDeadline: boolean;
  deadlineSourceBacked: boolean;
  predictedEligible: boolean;
  groundTruthEligible: boolean;
  discoverySource: "verified_feed" | "ai_assisted";
  predictedVerified: boolean;
  statusFresh: boolean;
  rankingGroup?: string | null;
  rank?: number | null;
  relevant?: boolean | null;
  authoritativeLinkHealthy?: boolean | null;
}

export interface FundingCertificationMetrics {
  currentOpenPrecision: number;
  confirmedDeadlineSourceCoverage: number;
  hardEligibilityFalsePositiveRate: number;
  precisionAt5: number;
  aiPromotedCount: number;
  staleOpenCount: number;
  brokenAuthoritativeLinkRate: number;
  predictedOpenCount: number;
  predictedEligibleCount: number;
  confirmedDeadlineCount: number;
  rankedTop5Count: number;
}

export const FUNDING_CERTIFICATION_THRESHOLDS = {
  currentOpenPrecisionMin: 0.98,
  confirmedDeadlineSourceCoverageMin: 1,
  hardEligibilityFalsePositiveRateMaxExclusive: 0.02,
  precisionAt5Min: 0.8,
  aiPromotedCountMax: 0,
  staleOpenCountMax: 0,
  brokenAuthoritativeLinkRateMax: 0.01,
} as const;

function safeRatio(numerator: number, denominator: number, emptyValue: number): number {
  return denominator > 0 ? numerator / denominator : emptyValue;
}

export function calculateFundingCertificationMetrics(
  observations: FundingCertificationObservation[],
): FundingCertificationMetrics {
  const predictedOpen = observations.filter((row) => row.predictedOpen);
  const trueOpen = predictedOpen.filter((row) => row.groundTruthOpen).length;

  const confirmedDeadlines = observations.filter((row) => row.confirmedDeadline);
  const backedDeadlines = confirmedDeadlines.filter((row) => row.deadlineSourceBacked).length;

  const predictedEligible = observations.filter((row) => row.predictedEligible);
  const hardEligibilityFalsePositives = predictedEligible.filter((row) => !row.groundTruthEligible).length;

  const rankedTop5 = observations.filter(
    (row) => row.rankingGroup && typeof row.rank === "number" && row.rank >= 1 && row.rank <= 5,
  );
  const relevantTop5 = rankedTop5.filter((row) => row.relevant === true).length;

  const aiPromotedCount = observations.filter(
    (row) => row.discoverySource === "ai_assisted" && (row.predictedVerified || row.predictedOpen),
  ).length;

  const staleOpenCount = observations.filter((row) => row.predictedOpen && !row.statusFresh).length;

  const authoritativeLinks = observations.filter(
    (row) => row.discoverySource === "verified_feed" && row.authoritativeLinkHealthy !== null && row.authoritativeLinkHealthy !== undefined,
  );
  const brokenAuthoritativeLinks = authoritativeLinks.filter((row) => row.authoritativeLinkHealthy === false).length;

  return {
    currentOpenPrecision: safeRatio(trueOpen, predictedOpen.length, 0),
    confirmedDeadlineSourceCoverage: safeRatio(backedDeadlines, confirmedDeadlines.length, 1),
    hardEligibilityFalsePositiveRate: safeRatio(hardEligibilityFalsePositives, predictedEligible.length, 0),
    precisionAt5: safeRatio(relevantTop5, rankedTop5.length, 0),
    aiPromotedCount,
    staleOpenCount,
    brokenAuthoritativeLinkRate: safeRatio(brokenAuthoritativeLinks, authoritativeLinks.length, 0),
    predictedOpenCount: predictedOpen.length,
    predictedEligibleCount: predictedEligible.length,
    confirmedDeadlineCount: confirmedDeadlines.length,
    rankedTop5Count: rankedTop5.length,
  };
}

export interface FundingCertificationGateResult {
  pass: boolean;
  failures: string[];
  metrics: FundingCertificationMetrics;
}

export function evaluateFundingCertificationGate(
  observations: FundingCertificationObservation[],
): FundingCertificationGateResult {
  const metrics = calculateFundingCertificationMetrics(observations);
  const failures: string[] = [];
  const t = FUNDING_CERTIFICATION_THRESHOLDS;

  if (metrics.predictedOpenCount === 0) failures.push("benchmark_has_no_predicted_open_cases");
  if (metrics.predictedEligibleCount === 0) failures.push("benchmark_has_no_predicted_eligible_cases");
  if (metrics.confirmedDeadlineCount === 0) failures.push("benchmark_has_no_confirmed_deadline_cases");
  if (metrics.rankedTop5Count < 5) failures.push("benchmark_has_insufficient_top5_cases");
  if (metrics.currentOpenPrecision < t.currentOpenPrecisionMin) failures.push("current_open_precision_below_98_percent");
  if (metrics.confirmedDeadlineSourceCoverage < t.confirmedDeadlineSourceCoverageMin) failures.push("confirmed_deadline_source_coverage_below_100_percent");
  if (metrics.hardEligibilityFalsePositiveRate >= t.hardEligibilityFalsePositiveRateMaxExclusive) failures.push("hard_eligibility_false_positive_rate_not_below_2_percent");
  if (metrics.precisionAt5 < t.precisionAt5Min) failures.push("precision_at_5_below_80_percent");
  if (metrics.aiPromotedCount > t.aiPromotedCountMax) failures.push("ai_discovery_promoted_to_verified_or_open");
  if (metrics.staleOpenCount > t.staleOpenCountMax) failures.push("stale_open_record_in_primary_output");
  if (metrics.brokenAuthoritativeLinkRate > t.brokenAuthoritativeLinkRateMax) failures.push("broken_authoritative_link_rate_above_1_percent");

  return { pass: failures.length === 0, failures, metrics };
}
