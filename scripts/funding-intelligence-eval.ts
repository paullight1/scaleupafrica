import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { selectBusinessIdentity, type ScoredBusinessIdentityCandidate } from "../Shared/src/lib/businessIdentity.ts";
import { classifyFundingStatus, isStatusFresh, type FundingStatusSignals } from "../Shared/src/lib/fundingStatus.ts";
import {
  falsePositiveRate,
  ndcgAtK,
  precision,
  precisionAtK,
  validateFundingEvaluationCorpus,
  type FundingEvaluationCorpus,
  type OrganisationEvaluationFixture,
  type OpportunityCycleEvaluationFixture,
  type EligibilityEvaluationFixture,
  type RelevanceEvaluationFixture,
} from "../Shared/src/lib/fundingEvaluation.ts";
import {
  recommendOpportunity,
  rankRecommendations,
  type RecommendationOpportunity,
  type RecommendationProfile,
} from "../Frontend/src/lib/funding/recommendationEngine.ts";

const ROOT = resolve(import.meta.dirname, "..");
const CORPUS_DIR = resolve(ROOT, "evaluation/funding/v1");
const ARTIFACT_DIR = resolve(ROOT, "artifacts");
const CERTIFICATION_MODE = process.argv.includes("--certification");
const LIVE_LINKS = process.argv.includes("--live-links");
const EVAL_NOW = new Date("2026-08-22T12:00:00Z");

if (LIVE_LINKS && process.env.ALLOW_FUNDING_LIVE_EVAL !== "1") {
  console.error("Live funding evaluation requires ALLOW_FUNDING_LIVE_EVAL=1.");
  process.exit(2);
}

interface IdentityFixture extends OrganisationEvaluationFixture {
  candidates: ScoredBusinessIdentityCandidate[];
}

const organisations = loadJson<IdentityFixture[]>("organisations.json");
const opportunityCycles = loadJson<OpportunityCycleEvaluationFixture[]>("opportunity-cycles.json");
const eligibility = loadJson<EligibilityEvaluationFixture[]>("eligibility.json");
const relevance = loadJson<RelevanceEvaluationFixture[]>("relevance.json");

const corpus: FundingEvaluationCorpus = {
  version: "funding-intelligence-v1",
  organisations,
  opportunityCycles,
  eligibility,
  relevance,
};

const validation = validateFundingEvaluationCorpus(corpus, { certificationMode: CERTIFICATION_MODE });
if (!validation.valid) {
  emitReport({
    benchmark_version: corpus.version,
    mode: CERTIFICATION_MODE ? "certification" : "engineering",
    pass: false,
    fixture_counts: validation.counts,
    validation_errors: validation.errors,
    external_blockers: CERTIFICATION_MODE
      ? ["Human-adjudicated minimum corpus is incomplete."]
      : [],
  });
  console.error(validation.errors.join("\n"));
  process.exit(1);
}

const identityReport = evaluateIdentity(organisations);
const statusReport = evaluateStatus(opportunityCycles);
const eligibilityReport = evaluateEligibility(eligibility);
const rankingReport = evaluateRanking(relevance);
const provenanceReport = evaluateProvenance(opportunityCycles);

const failures: string[] = [];
if (identityReport.wrong_auto_selections > 0) failures.push("wrong_identity_auto_selection");
if (identityReport.ambiguous_withheld_rate < 1) failures.push("ambiguous_identity_not_withheld");
if (statusReport.primary_precision < 0.98) failures.push("current_open_precision_below_98_percent");
if (statusReport.historical_cycle_contamination > 0) failures.push("historical_cycle_contamination");
if (statusReport.stale_primary_records > 0) failures.push("stale_primary_records");
if (eligibilityReport.false_positive_rate >= 0.02) failures.push("eligibility_false_positive_rate_not_below_2_percent");
if (rankingReport.precision_at_5 < 0.8) failures.push("precision_at_5_below_80_percent");
if (provenanceReport.confirmed_deadline_source_coverage < 1) failures.push("confirmed_deadline_source_coverage_below_100_percent");

const report = {
  benchmark_version: corpus.version,
  mode: CERTIFICATION_MODE ? "certification" : "engineering",
  commit_sha: process.env.GITHUB_SHA ?? null,
  run_date: new Date().toISOString(),
  fixture_counts: validation.counts,
  identity: identityReport,
  status: statusReport,
  eligibility: eligibilityReport,
  ranking: rankingReport,
  provenance: provenanceReport,
  thresholds: {
    identity_wrong_auto_selections_max: 0,
    ambiguous_withheld_rate_min: 1,
    current_open_precision_min: 0.98,
    historical_cycle_contamination_max: 0,
    stale_primary_records_max: 0,
    hard_eligibility_false_positive_rate_max_exclusive: 0.02,
    precision_at_5_min: 0.8,
    confirmed_deadline_source_coverage_min: 1,
  },
  pass: failures.length === 0,
  failures,
  live_checks_ran: LIVE_LINKS,
  external_blockers: CERTIFICATION_MODE
    ? []
    : [
        "Engineering fixtures are synthetic and do not count as human adjudication.",
        "Production certification requires >=100/200/150/50 dual-human-labelled corpus.",
        "Live/staging source freshness and authoritative-link checks have not run.",
      ],
};

emitReport(report);
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exit(1);

function evaluateIdentity(fixtures: IdentityFixture[]) {
  let autoProposed = 0;
  let correctAutoProposed = 0;
  let ambiguousExpected = 0;
  let ambiguousWithheld = 0;
  let wrongAutoSelections = 0;

  for (const fixture of fixtures) {
    const selection = selectBusinessIdentity(
      {
        businessName: fixture.input_name,
        website: fixture.website_hint ?? null,
        countryHint: fixture.country_hint ?? null,
      },
      fixture.candidates,
    );
    if (selection.state === "resolved") {
      autoProposed += 1;
      const correct =
        fixture.expected_state === "resolved" &&
        selection.candidate?.canonicalName === fixture.expected_canonical_name;
      if (correct) correctAutoProposed += 1;
      else wrongAutoSelections += 1;
    }
    if (fixture.expected_state === "ambiguous") {
      ambiguousExpected += 1;
      if (selection.state !== "resolved") ambiguousWithheld += 1;
    }
  }

  return {
    auto_proposed: autoProposed,
    correct_auto_proposed: correctAutoProposed,
    precision: precision(correctAutoProposed, wrongAutoSelections),
    ambiguous_expected: ambiguousExpected,
    ambiguous_withheld_rate: ambiguousExpected ? ambiguousWithheld / ambiguousExpected : 1,
    wrong_auto_selections: wrongAutoSelections,
  };
}

function evaluateStatus(fixtures: OpportunityCycleEvaluationFixture[]) {
  let predictedPrimary = 0;
  let truePrimary = 0;
  let historicalContamination = 0;
  let stalePrimary = 0;
  const byClass: Record<string, { predicted: number; correct: number }> = {};

  for (const fixture of fixtures) {
    const signals: FundingStatusSignals = {
      sourceVerified: fixture.source_verified,
      checkedAt: new Date(fixture.checked_at),
      cycleLabel: fixture.cycle_label ?? null,
      explicitOpen: fixture.signals.explicit_open,
      explicitClosed: fixture.signals.explicit_closed,
      explicitPaused: fixture.signals.explicit_paused,
      explicitRolling: fixture.signals.explicit_rolling,
      applicationCtaActive: fixture.signals.application_cta_active,
      opensAt: dateOrNull(fixture.signals.opens_at),
      deadlineAt: dateOrNull(fixture.signals.deadline_at),
      hasCurrentCycleEvidence: fixture.signals.has_current_cycle_evidence,
      conflict: fixture.signals.conflict,
    };
    const predicted = classifyFundingStatus(signals, EVAL_NOW);
    const bucket = byClass[predicted] ?? { predicted: 0, correct: 0 };
    bucket.predicted += 1;
    if (predicted === fixture.expected_application_status) bucket.correct += 1;
    byClass[predicted] = bucket;

    const isPrimaryPrediction = predicted === "open" || predicted === "closing_soon" || predicted === "rolling";
    const isPrimaryTruth =
      fixture.expected_application_status === "open" ||
      fixture.expected_application_status === "closing_soon" ||
      fixture.expected_application_status === "rolling";
    if (isPrimaryPrediction) {
      predictedPrimary += 1;
      if (isPrimaryTruth) truePrimary += 1;
      if (!isStatusFresh(predicted, fixture.checked_at, EVAL_NOW)) stalePrimary += 1;
      if (fixture.historical_cycle_contamination) historicalContamination += 1;
    }
  }

  return {
    primary_precision: precision(truePrimary, predictedPrimary - truePrimary),
    predicted_primary: predictedPrimary,
    historical_cycle_contamination: historicalContamination,
    stale_primary_records: stalePrimary,
    per_class_precision: Object.fromEntries(
      Object.entries(byClass).map(([status, row]) => [status, precision(row.correct, row.predicted - row.correct)]),
    ),
  };
}

function evaluateEligibility(fixtures: EligibilityEvaluationFixture[]) {
  let labelledIneligible = 0;
  let falseEligible = 0;
  let predictedEligible = 0;
  let predictedIneligible = 0;
  let abstentions = 0;

  for (const fixture of fixtures) {
    const result = recommendOpportunity(
      fixture.profile as RecommendationProfile,
      fixture.opportunity as unknown as RecommendationOpportunity,
      EVAL_NOW,
    );
    if (fixture.expected_eligibility === "ineligible") labelledIneligible += 1;
    if (result.eligibilityStatus === "eligible") {
      predictedEligible += 1;
      if (fixture.expected_eligibility === "ineligible") falseEligible += 1;
    } else if (result.eligibilityStatus === "ineligible") {
      predictedIneligible += 1;
    } else {
      abstentions += 1;
    }
  }

  const trueNegative = Math.max(0, labelledIneligible - falseEligible);
  return {
    labelled_ineligible: labelledIneligible,
    false_eligible: falseEligible,
    false_positive_rate: falsePositiveRate(falseEligible, trueNegative),
    predicted_eligible: predictedEligible,
    predicted_ineligible: predictedIneligible,
    abstentions,
  };
}

function evaluateRanking(fixtures: RelevanceEvaluationFixture[]) {
  const allTop5: number[] = [];
  const ndcgs: number[] = [];
  const segments: Record<string, { pools: number; precisionSum: number; ndcgSum: number }> = {};

  for (const fixture of fixtures) {
    const ranked = rankRecommendations(
      fixture.profile as RecommendationProfile,
      fixture.candidates as RecommendationOpportunity[],
      EVAL_NOW,
    );
    const top5 = ranked.slice(0, 5).map((row) => fixture.relevance_by_id[String(row.opportunity.id)] ?? 0);
    while (top5.length < 5) top5.push(0);
    allTop5.push(...top5);
    const poolP5 = precisionAtK(top5, 5);
    const poolNdcg = ndcgAtK(top5, 5);
    ndcgs.push(poolNdcg);

    for (const [dimension, value] of Object.entries(fixture.segment)) {
      const key = `${dimension}:${value}`;
      const current = segments[key] ?? { pools: 0, precisionSum: 0, ndcgSum: 0 };
      current.pools += 1;
      current.precisionSum += poolP5;
      current.ndcgSum += poolNdcg;
      segments[key] = current;
    }
  }

  return {
    precision_at_5: precisionAtK(allTop5, allTop5.length),
    ndcg_at_5: ndcgs.length ? ndcgs.reduce((sum, value) => sum + value, 0) / ndcgs.length : 0,
    pools: fixtures.length,
    segments: Object.fromEntries(
      Object.entries(segments).map(([key, row]) => [key, {
        sample_count: row.pools,
        precision_at_5: row.precisionSum / row.pools,
        ndcg_at_5: row.ndcgSum / row.pools,
      }]),
    ),
  };
}

function evaluateProvenance(fixtures: OpportunityCycleEvaluationFixture[]) {
  const confirmed = fixtures.filter((fixture) => fixture.deadline_status === "confirmed");
  const backed = confirmed.filter(
    (fixture) => Boolean(fixture.signals.deadline_at) && fixture.signals.has_current_cycle_evidence && fixture.source_urls.length > 0,
  );
  return {
    confirmed_deadlines: confirmed.length,
    confirmed_deadline_source_coverage: confirmed.length ? backed.length / confirmed.length : 1,
  };
}

function dateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function loadJson<T>(fileName: string): T {
  return JSON.parse(readFileSync(resolve(CORPUS_DIR, fileName), "utf8")) as T;
}

function emitReport(report: unknown) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(resolve(ARTIFACT_DIR, "funding-intelligence-eval.json"), JSON.stringify(report, null, 2) + "\n");
}
