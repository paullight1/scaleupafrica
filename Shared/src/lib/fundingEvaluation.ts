export type FundingAdjudicationStatus = "synthetic_engineering" | "human_adjudicated";

export interface OrganisationEvaluationFixture {
  id: string;
  input_name: string;
  country_hint?: string | null;
  website_hint?: string | null;
  expected_state: "resolved" | "ambiguous" | "not_found";
  expected_canonical_name?: string | null;
  expected_domain?: string | null;
  source_urls: string[];
  reviewers: string[];
  adjudication_status: FundingAdjudicationStatus;
}

export interface OpportunityCycleEvaluationFixture {
  id: string;
  opportunity_id: string;
  cycle_label?: string | null;
  checked_at: string;
  source_verified: boolean;
  signals: {
    explicit_open: boolean;
    explicit_closed: boolean;
    explicit_paused: boolean;
    explicit_rolling: boolean;
    application_cta_active: boolean;
    opens_at?: string | null;
    deadline_at?: string | null;
    has_current_cycle_evidence: boolean;
    conflict: boolean;
  };
  expected_application_status:
    | "open"
    | "closing_soon"
    | "rolling"
    | "upcoming"
    | "closed"
    | "paused"
    | "unknown";
  deadline_status?: "confirmed" | "rolling" | "unknown";
  source_urls: string[];
  reviewers: string[];
  adjudication_status: FundingAdjudicationStatus;
  historical_cycle_contamination?: boolean;
}

export interface EligibilityEvaluationFixture {
  id: string;
  profile: Record<string, unknown>;
  opportunity: Record<string, unknown>;
  expected_eligibility: "eligible" | "insufficient_information" | "ineligible";
  source_urls: string[];
  reviewers: string[];
  adjudication_status: FundingAdjudicationStatus;
}

export interface RelevanceEvaluationFixture {
  id: string;
  profile: Record<string, unknown>;
  candidates: Array<Record<string, unknown> & { id: string }>;
  relevance_by_id: Record<string, 0 | 1 | 2 | 3>;
  segment: {
    country: string;
    organisation_type: string;
    business_stage: string;
    preferred_funding_type: string;
  };
  reviewers: string[];
  adjudication_status: FundingAdjudicationStatus;
}

export interface FundingEvaluationCorpus {
  version: string;
  organisations: OrganisationEvaluationFixture[];
  opportunityCycles: OpportunityCycleEvaluationFixture[];
  eligibility: EligibilityEvaluationFixture[];
  relevance: RelevanceEvaluationFixture[];
}

export interface FundingCorpusValidationOptions {
  certificationMode?: boolean;
}

export interface FundingCorpusValidationResult {
  valid: boolean;
  errors: string[];
  counts: {
    organisations: number;
    opportunityCycles: number;
    eligibility: number;
    relevance: number;
  };
}

export const FUNDING_ENGINEERING_MINIMUMS = {
  organisations: 20,
  opportunityCycles: 40,
  eligibility: 20,
  relevance: 10,
} as const;

export const FUNDING_CERTIFICATION_MINIMUMS = {
  organisations: 100,
  opportunityCycles: 200,
  eligibility: 150,
  relevance: 50,
} as const;

export function precision(tp: number, fp: number): number {
  const denominator = tp + fp;
  return denominator > 0 ? tp / denominator : 0;
}

export function falsePositiveRate(fp: number, tn: number): number {
  const denominator = fp + tn;
  return denominator > 0 ? fp / denominator : 0;
}

export function precisionAtK(relevance: number[], k: number): number {
  const limit = Math.max(0, Math.floor(k));
  if (limit === 0) return 0;
  const top = relevance.slice(0, limit);
  if (top.length === 0) return 0;
  return top.filter((value) => value >= 2).length / limit;
}

export function ndcgAtK(relevance: number[], k: number): number {
  const limit = Math.max(0, Math.floor(k));
  if (limit === 0) return 0;
  const actual = relevance.slice(0, limit);
  const ideal = [...relevance].sort((a, b) => b - a).slice(0, limit);
  const dcg = discountedCumulativeGain(actual);
  const idealDcg = discountedCumulativeGain(ideal);
  return idealDcg > 0 ? dcg / idealDcg : 0;
}

export function sourceCoverage(records: { hasAuthoritativeSource: boolean }[]): number {
  return records.length
    ? records.filter((record) => record.hasAuthoritativeSource).length / records.length
    : 0;
}

export function freshnessViolationRate(records: { violatesFreshness: boolean }[]): number {
  return records.length
    ? records.filter((record) => record.violatesFreshness).length / records.length
    : 0;
}

export function validateFundingEvaluationCorpus(
  corpus: FundingEvaluationCorpus,
  options: FundingCorpusValidationOptions = {},
): FundingCorpusValidationResult {
  const certificationMode = options.certificationMode === true;
  const minimums = certificationMode ? FUNDING_CERTIFICATION_MINIMUMS : FUNDING_ENGINEERING_MINIMUMS;
  const errors: string[] = [];
  const counts = {
    organisations: corpus.organisations.length,
    opportunityCycles: corpus.opportunityCycles.length,
    eligibility: corpus.eligibility.length,
    relevance: corpus.relevance.length,
  };

  if (!corpus.version.trim()) errors.push("corpus_version_missing");
  for (const [key, minimum] of Object.entries(minimums)) {
    if (counts[key as keyof typeof counts] < minimum) {
      errors.push(`${key}_count_below_${minimum}`);
    }
  }

  validateUniqueIds("organisation", corpus.organisations, errors);
  validateUniqueIds("opportunity_cycle", corpus.opportunityCycles, errors);
  validateUniqueIds("eligibility", corpus.eligibility, errors);
  validateUniqueIds("relevance", corpus.relevance, errors);

  for (const fixture of corpus.organisations) {
    validateReviewers("organisation", fixture.id, fixture.reviewers, fixture.adjudication_status, certificationMode, errors);
    if (fixture.expected_state === "resolved" && fixture.source_urls.length === 0) {
      errors.push(`organisation:${fixture.id}:resolved_without_source`);
    }
    if (fixture.expected_state === "resolved" && !fixture.expected_canonical_name) {
      errors.push(`organisation:${fixture.id}:resolved_without_canonical_name`);
    }
  }

  for (const fixture of corpus.opportunityCycles) {
    validateReviewers("opportunity_cycle", fixture.id, fixture.reviewers, fixture.adjudication_status, certificationMode, errors);
    if (fixture.deadline_status === "confirmed") {
      if (!fixture.signals.deadline_at || !fixture.signals.has_current_cycle_evidence || fixture.source_urls.length === 0) {
        errors.push(`opportunity_cycle:${fixture.id}:confirmed_deadline_without_current_cycle_source`);
      }
    }
  }

  for (const fixture of corpus.eligibility) {
    validateReviewers("eligibility", fixture.id, fixture.reviewers, fixture.adjudication_status, certificationMode, errors);
    if (fixture.source_urls.length === 0) errors.push(`eligibility:${fixture.id}:missing_source`);
  }

  for (const fixture of corpus.relevance) {
    validateReviewers("relevance", fixture.id, fixture.reviewers, fixture.adjudication_status, certificationMode, errors);
    if (fixture.candidates.length < 5) errors.push(`relevance:${fixture.id}:candidate_pool_below_5`);
    for (const candidate of fixture.candidates) {
      if (!(candidate.id in fixture.relevance_by_id)) {
        errors.push(`relevance:${fixture.id}:missing_label:${candidate.id}`);
      }
    }
  }

  return { valid: errors.length === 0, errors, counts };
}

function discountedCumulativeGain(relevance: number[]): number {
  return relevance.reduce((sum, value, index) => {
    const gain = Math.pow(2, Math.max(0, value)) - 1;
    return sum + gain / Math.log2(index + 2);
  }, 0);
}

function validateUniqueIds(
  type: string,
  fixtures: Array<{ id: string }>,
  errors: string[],
) {
  const seen = new Set<string>();
  for (const fixture of fixtures) {
    if (!fixture.id.trim()) {
      errors.push(`${type}:blank_id`);
      continue;
    }
    if (seen.has(fixture.id)) errors.push(`${type}:duplicate_id:${fixture.id}`);
    seen.add(fixture.id);
  }
}

function validateReviewers(
  type: string,
  id: string,
  reviewers: string[],
  adjudicationStatus: FundingAdjudicationStatus,
  certificationMode: boolean,
  errors: string[],
) {
  const unique = new Set(reviewers.map((reviewer) => reviewer.trim()).filter(Boolean));
  if (certificationMode) {
    if (adjudicationStatus !== "human_adjudicated") {
      errors.push(`${type}:${id}:not_human_adjudicated`);
    }
    if (unique.size < 2) errors.push(`${type}:${id}:requires_two_human_reviewers`);
  }
}
