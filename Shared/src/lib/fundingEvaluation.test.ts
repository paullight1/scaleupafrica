import { describe, expect, it } from "vitest";
import {
  falsePositiveRate,
  freshnessViolationRate,
  ndcgAtK,
  precision,
  precisionAtK,
  sourceCoverage,
  validateFundingEvaluationCorpus,
  type FundingEvaluationCorpus,
} from "./fundingEvaluation";

function seedCorpus(): FundingEvaluationCorpus {
  return {
    version: "engineering-v1",
    organisations: Array.from({ length: 20 }, (_, index) => ({
      id: `org-${index + 1}`,
      input_name: `Organisation ${index + 1}`,
      expected_state: "resolved" as const,
      expected_canonical_name: `Organisation ${index + 1}`,
      expected_domain: `org-${index + 1}.example`,
      source_urls: [`https://org-${index + 1}.example/about`],
      reviewers: [],
      adjudication_status: "synthetic_engineering" as const,
    })),
    opportunityCycles: Array.from({ length: 40 }, (_, index) => ({
      id: `cycle-${index + 1}`,
      opportunity_id: `opportunity-${index + 1}`,
      cycle_label: "2026",
      checked_at: "2026-08-22T12:00:00Z",
      source_verified: true,
      signals: {
        explicit_open: true,
        explicit_closed: false,
        explicit_paused: false,
        explicit_rolling: false,
        application_cta_active: true,
        opens_at: null,
        deadline_at: "2026-09-30T23:59:00Z",
        has_current_cycle_evidence: true,
        conflict: false,
      },
      expected_application_status: "open" as const,
      deadline_status: "confirmed" as const,
      source_urls: [`https://funder-${index + 1}.example/2026`],
      reviewers: [],
      adjudication_status: "synthetic_engineering" as const,
    })),
    eligibility: Array.from({ length: 20 }, (_, index) => ({
      id: `eligibility-${index + 1}`,
      profile: { country: "Nigeria" },
      opportunity: { title: `Opportunity ${index + 1}`, countryFocus: ["Nigeria"] },
      expected_eligibility: "eligible" as const,
      source_urls: [`https://funder-${index + 1}.example/eligibility`],
      reviewers: [],
      adjudication_status: "synthetic_engineering" as const,
    })),
    relevance: Array.from({ length: 10 }, (_, index) => ({
      id: `relevance-${index + 1}`,
      profile: { country: "Nigeria" },
      candidates: Array.from({ length: 5 }, (_candidate, candidateIndex) => ({
        id: `relevance-${index + 1}-candidate-${candidateIndex + 1}`,
      })),
      relevance_by_id: Object.fromEntries(
        Array.from({ length: 5 }, (_candidate, candidateIndex) => [
          `relevance-${index + 1}-candidate-${candidateIndex + 1}`,
          candidateIndex < 4 ? 3 : 0,
        ]),
      ) as Record<string, 0 | 1 | 2 | 3>,
      segment: {
        country: "Nigeria",
        organisation_type: "company",
        business_stage: "growth",
        preferred_funding_type: "grant",
      },
      reviewers: [],
      adjudication_status: "synthetic_engineering" as const,
    })),
  };
}

describe("funding evaluation metrics", () => {
  it("matches hand-calculated precision and false-positive rate", () => {
    expect(precision(8, 2)).toBe(0.8);
    expect(falsePositiveRate(1, 99)).toBe(0.01);
  });

  it("computes Precision@5 and NDCG@5 from graded relevance", () => {
    expect(precisionAtK([3, 2, 0, 1, 0], 5)).toBe(0.4);
    expect(ndcgAtK([3, 2, 0, 1, 0], 5)).toBeGreaterThan(0);
    expect(ndcgAtK([3, 2, 1, 0, 0], 5)).toBe(1);
  });

  it("computes source coverage and freshness violation rates", () => {
    expect(sourceCoverage([{ hasAuthoritativeSource: true }, { hasAuthoritativeSource: false }])).toBe(0.5);
    expect(freshnessViolationRate([{ violatesFreshness: true }, { violatesFreshness: false }])).toBe(0.5);
  });
});

describe("funding evaluation corpus validation", () => {
  it("accepts the engineering minimum without pretending it is human certification", () => {
    const result = validateFundingEvaluationCorpus(seedCorpus());
    expect(result.valid, result.errors.join(", ")).toBe(true);
  });

  it("rejects duplicate fixture IDs", () => {
    const corpus = seedCorpus();
    corpus.organisations[1].id = corpus.organisations[0].id;
    const result = validateFundingEvaluationCorpus(corpus);
    expect(result.errors).toContain(`organisation:duplicate_id:${corpus.organisations[0].id}`);
  });

  it("rejects resolved identities without evidence and confirmed deadlines without current-cycle source evidence", () => {
    const corpus = seedCorpus();
    corpus.organisations[0].source_urls = [];
    corpus.opportunityCycles[0].source_urls = [];
    const result = validateFundingEvaluationCorpus(corpus);
    expect(result.errors).toContain(`organisation:${corpus.organisations[0].id}:resolved_without_source`);
    expect(result.errors).toContain(`opportunity_cycle:${corpus.opportunityCycles[0].id}:confirmed_deadline_without_current_cycle_source`);
  });

  it("fails certification mode for undersized or synthetic/non-human-adjudicated corpora", () => {
    const result = validateFundingEvaluationCorpus(seedCorpus(), { certificationMode: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("organisations_count_below_100");
    expect(result.errors).toContain("opportunityCycles_count_below_200");
    expect(result.errors).toContain("eligibility_count_below_150");
    expect(result.errors).toContain("relevance_count_below_50");
    expect(result.errors.some((error) => error.endsWith(":not_human_adjudicated"))).toBe(true);
    expect(result.errors.some((error) => error.endsWith(":requires_two_human_reviewers"))).toBe(true);
  });
});
