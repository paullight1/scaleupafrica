# Funding Intelligence Accuracy Certification — P0-D

Date: 23 August 2026

Status: **REPOSITORY CERTIFICATION HARNESS IMPLEMENTED / CURRENT EXECUTION BLOCKED_EXTERNAL / LIVE CERTIFICATION BLOCKED_EXTERNAL**

## Why this status is deliberately conservative

The current branch contains the deterministic benchmark, anti-gaming tests, targeted certification workflow and an explicit live-link certification mode. However, the latest GitHub Actions jobs are failing before checkout/setup (`steps: null`), so the current branch head has not produced fresh executable CI evidence.

Previous/static benchmark expectations are documented below, but they must not be represented as a fresh PASS for the current head until the workflow actually executes.

## Implemented gates

Primary release thresholds:

| Metric | Required |
| --- | ---: |
| Current-open status precision | >= 98% |
| Confirmed-deadline source coverage | 100% |
| Hard eligibility false-positive rate | < 2% |
| Precision@5 | >= 80% |
| AI discoveries promoted to verified/open | 0 |
| Stale OPEN records in primary output | 0 |
| Primary authoritative-source coverage | >= 95% |
| Broken primary authoritative-link rate in live mode | < 1% |

The evaluator also rejects undersized or non-human-adjudicated corpora in certification mode.

## Two evaluation modes

### Engineering mode

`npm run eval:funding`

Uses the fixed engineering corpus to exercise identity resolution, opportunity status, hard eligibility, ranking, provenance and trust invariants. This is useful for regression testing, not a production accuracy certificate.

### Human/live certification mode

The evaluator accepts live links only with both explicit controls:

```bash
ALLOW_FUNDING_LIVE_EVAL=1 npm run eval:funding -- --certification --live-links
```

`--live-links` without `--certification` fails closed.

The live checker now performs actual network work. It reuses `safeExternalFetch` with Node DNS injected, so live certification inherits the production funding-source protections:

- HTTP(S) only;
- DNS/private-network blocking;
- manual redirect revalidation;
- maximum 5 redirects;
- 10-second timeout;
- 2 MiB response cap;
- HTML/plain-text/JSON content types only.

The report records:

```text
live_checks_ran
links_checked
broken_links
broken_link_rate
bounded failure details
```

A Boolean flag can no longer claim live checks ran without requests actually being performed.

## Human corpus requirements

Production certification requires at least:

- 100 organisation identity fixtures;
- 200 opportunity-cycle fixtures;
- 150 eligibility pairs;
- 50 ranking pools;
- `human_adjudicated` labels;
- at least two distinct reviewers per fixture.

Synthetic engineering fixtures intentionally fail certification-mode corpus validation.

## Static engineering benchmark expectation

The existing fixed engineering fixture was designed around the following threshold behaviour:

| Metric | Expected engineering result |
| --- | ---: |
| Current-open precision | 100% |
| Confirmed-deadline source coverage | 100% |
| Hard eligibility false-positive rate | 0% |
| Precision@5 | 80% |
| AI promotion count | 0 |
| Stale OPEN count | 0 |

These figures describe the benchmark design/last deterministic expectation. They are **not** a fresh current-head CI result while Actions is unable to execute steps.

## Anti-gaming coverage

The targeted tests deliberately fail certification for:

- a false OPEN prediction;
- confirmed deadline without current-cycle source evidence;
- hard eligibility false positives at or above 2%;
- Precision@5 below 80%;
- any AI discovery promoted to verified/open;
- any stale OPEN primary record;
- excessive broken authoritative links;
- insufficient benchmark size;
- non-human certification fixtures;
- live-link mode without explicit certification/env opt-in.

## Additional repository trust gates

The targeted workflow also exercises:

- status conflict/freshness truth tables;
- Business Enrichment identity ambiguity rules;
- Recommendation Engine and primary Funding Radar gate;
- trust-separated Opportunity Search;
- application CTA eligibility rules;
- member workflow timestamp/state isolation;
- notification decision/queue/delivery contracts;
- Funding alert email templates;
- safe external-fetch contract;
- Deno checks for funding Edge functions;
- Backend/Frontend/Shared typechecks.

## Live P0-D PASS still requires

1. Cresciva Supabase project `dwyglydswegyvjowzdot` connected and P0 migrations deployed.
2. Business Enrichment, source-refresh and funding-notification functions deployed.
3. Real authoritative source registry populated and scheduler running.
4. Full human-adjudicated corpus at the minimum sizes above.
5. Live current-cycle status precision >=98%.
6. Live confirmed-deadline source coverage =100%.
7. Real hard eligibility false-positive audit <2%.
8. Real ranking Precision@5 >=80%.
9. Zero AI-only promotion and zero stale OPEN leakage.
10. Live primary authoritative-source coverage >=95%.
11. Actual bounded live-link check with broken-link rate <1%.
12. Successful final GitHub Actions CI + Funding Intelligence Eval/Certification on the exact release head.

Until those conditions exist, the correct release state is:

> **Certification machinery implemented; current repository execution and live Funding Intelligence certification remain BLOCKED_EXTERNAL.**
