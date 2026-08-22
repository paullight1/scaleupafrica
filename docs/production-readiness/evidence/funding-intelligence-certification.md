# Funding Intelligence Accuracy Certification — P0-D

Date: 22 August 2026

Status: **REPOSITORY BENCHMARK PASS / LIVE CERTIFICATION BLOCKED_EXTERNAL**

## Gate

P0-D converts Funding Intelligence accuracy into hard release criteria. The gate is implemented in:

- `Shared/src/lib/fundingCertification.ts`
- `Shared/src/lib/fundingCertification.test.ts`
- `Shared/src/lib/fundingCertificationBenchmark.test.ts`
- `docs/production-readiness/fixtures/funding-intelligence-certification-v1.json`
- `.github/workflows/funding-intelligence-certification.yml`

## Required thresholds

| Metric | Required |
| --- | ---: |
| Current-open status precision | >= 98% |
| Confirmed-deadline source coverage | 100% |
| Hard eligibility false-positive rate | < 2% |
| Precision@5 | >= 80% |
| AI discoveries promoted to verified/open | 0 |
| Stale OPEN records in primary output | 0 |
| Broken authoritative-link rate | <= 1% |

The evaluator also rejects trivially undersized benchmarks that contain no meaningful OPEN, eligibility, deadline or top-five cases.

## Repository benchmark v1

Fixture: `funding-intelligence-certification-v1.json`

The benchmark includes positive and negative current-cycle cases, closed/paused/upcoming/unknown records, stale evidence, AI discovery, geography/stage eligibility negatives, missing eligibility information and three top-five ranking groups.

Expected repository metrics from v1:

| Metric | Benchmark result |
| --- | ---: |
| Current-open precision | 100% |
| Confirmed-deadline source coverage | 100% |
| Hard eligibility false-positive rate | 0% |
| Precision@5 | 80% |
| AI promotion count | 0 |
| Stale OPEN count | 0 |
| Broken authoritative-link rate | 0% |

These values clear the repository thresholds exactly where intended; Precision@5 is at the minimum accepted boundary and therefore protects the `>= 80%` contract.

## Anti-gaming tests

The metric test suite deliberately creates bad benchmark observations and verifies that certification fails for:

- one false OPEN prediction;
- any confirmed deadline without source evidence;
- eligibility false-positive rate exactly 2% (the requirement is strictly below 2%);
- Precision@5 below 80%;
- any AI discovery promoted to verified or open;
- any stale OPEN record;
- broken authoritative-link rate above 1%;
- an undersized benchmark with fewer than five top-ranked cases.

## Dedicated CI gate

`Funding Intelligence Certification` runs targeted trust tests across Shared, Frontend, Backend and Deno Edge functions. It also checks source-code invariants including:

- AI discovery rewritten to `application_status: unknown`;
- AI discovery rewritten to `verification_status: unverified`;
- refresh batch hard-cap 25;
- evidence extractor forbidden from outputting trusted `application_status`;
- exact honest Funding Radar zero-state copy present.

## Why this is not live certification yet

The repository benchmark measures the deterministic gate and the currently adjudicated static fixture. It does **not** prove live source quality, provider extraction quality, real-world status coverage, production link health or real user ranking quality.

Live P0-D PASS additionally requires:

1. Cresciva Supabase project `dwyglydswegyvjowzdot` connected and P0 migrations deployed.
2. Funding source refresh scheduler running over real authoritative URLs.
3. A separately reviewed staging/production benchmark sampled from real records, with adjudicators independent of the system output.
4. Real current-cycle status precision measured at >=98%.
5. Every live `deadline_status=confirmed` record traced to current-cycle source evidence.
6. Real hard eligibility false-positive audit below 2%.
7. Real query-set Precision@5 >=80%.
8. Zero AI-only promotion and zero stale OPEN leakage in sampled primary output.
9. Broken authoritative-link rate <=1%.
10. A genuine final GitHub Actions certification run. Current Actions jobs are failing before checkout/setup (`steps: null`), so the latest branch head has no executable CI evidence yet.

Until these conditions are met, the correct release state is:

**Repository benchmark PASS; live funding-intelligence certification BLOCKED_EXTERNAL.**