# Funding Intelligence Accuracy Certification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a repeatable evidence gate proving that Cresciva's business identity, current-cycle status, eligibility and top recommendations meet the accuracy standard required for the paid funding promise.

**Architecture:** Build a versioned benchmark corpus with human-labelled organisation identities, opportunity cycles and eligibility/relevance judgments. Run deterministic evaluation code in CI against frozen fixtures using the exact production identity/status/recommendation functions; run separate staging/live source-freshness certification against deployed providers. Release claims are driven by measured thresholds, not unit-test count or anecdotal examples.

**Tech Stack:** TypeScript on Node 22's type-stripping runtime, Vitest, JSON fixtures, existing Recommendation/Search/Status/Identity engines, GitHub Actions, Markdown evidence reports.

**Spec:** `docs/superpowers/specs/2026-08-22-business-to-funding-intelligence-design.md`

## Global Constraints

- Benchmark labels are human/source-grounded; an LLM cannot grade its own production outputs.
- Minimum certification corpus: 100 organisation profiles and 200 opportunity-cycle records.
- Primary source evidence is retained as URL + bounded fact/excerpt metadata; do not copy entire third-party pages into fixtures.
- Benchmark includes positive, negative, ambiguous and unknown cases.
- No sensitive demographic inference fixtures unless a user-supplied field is explicitly needed to test a legitimate eligibility rule.
- Paid `Open for you` production claim remains gated until all P0 thresholds pass.
- Metric/version changes require documented rationale and a new benchmark version; do not move thresholds after seeing a failing score.
- The evaluator imports the exact production modules; it must not reimplement scoring/classification logic.
- Normal CI never performs live third-party network checks.

---

## Release Thresholds

| Metric | Required |
| --- | ---: |
| Business identity precision for auto-proposed identities | 100% on acceptance benchmark; target >=99% ongoing |
| Ambiguous identity correctly withheld | 100% |
| Primary recommendations with authoritative source evidence | >=95% |
| Open/Closing Soon/Rolling precision | >=98% |
| Confirmed deadline source coverage | 100% |
| Hard eligibility false-positive rate | <2% |
| Broken official-source links in primary sample | <1% |
| AI discoveries incorrectly promoted to verified/open | 0 |
| Precision@5 for human-labelled useful recommendations | >=80% |
| Stale OPEN records past SLA in primary output | 0 |

Any P0 threshold failure = release gate FAIL.

---

## File Structure

**Create**

- `evaluation/funding/v1/organisations.json` — 100+ labelled organisation inputs/identities.
- `evaluation/funding/v1/opportunity-cycles.json` — 200+ source-grounded cycle/status fixtures.
- `evaluation/funding/v1/eligibility.json` — organisation/opportunity hard-eligibility labels.
- `evaluation/funding/v1/relevance.json` — human relevance judgments and candidate pools.
- `evaluation/funding/v1/README.md` — labelling rubric and provenance rules.
- `Shared/src/lib/fundingEvaluation.ts` — pure metric helpers.
- `Shared/src/lib/fundingEvaluation.test.ts` — metric/fixture-validation tests.
- `scripts/funding-intelligence-eval.ts` — deterministic benchmark runner importing production TypeScript modules.
- `docs/product/FUNDING-INTELLIGENCE-EVALUATION.md` — evaluation methodology.
- `docs/production-readiness/evidence/funding-intelligence-certification.md` — release evidence.
- `.github/workflows/funding-intelligence-eval.yml` — deterministic benchmark workflow.

**Modify**

- `package.json` — add `eval:funding` script using Node 22 type stripping.
- `docs/product/RECOMMENDATION-ENGINE.md` — link ranking certification.
- `docs/product/OPPORTUNITY-SEARCH-ENGINE.md` — link source/status certification.
- `docs/product/BUSINESS-ENRICHMENT-ENGINE.md` — link identity certification.
- `docs/product/OPPORTUNITY-STATUS-ENGINE.md` — link current-cycle certification.

**Do not modify normal `.github/workflows/ci.yml` in this plan.** The new evaluation workflow is its own release check; requiring it in branch protection is a repository-setting action after the workflow is observed green.

---

### Task 1: Define versioned benchmark schemas and labelling rubric

**Files:**
- Create: `evaluation/funding/v1/README.md`
- Create: `evaluation/funding/v1/organisations.json`
- Create: `evaluation/funding/v1/opportunity-cycles.json`
- Create: `evaluation/funding/v1/eligibility.json`
- Create: `evaluation/funding/v1/relevance.json`
- Create: `Shared/src/lib/fundingEvaluation.test.ts`

**Interfaces:**

Organisation fixture:

```json
{
  "id": "org-001",
  "input_name": "Example Organisation",
  "country_hint": "Nigeria",
  "website_hint": "https://example.org",
  "expected_state": "resolved",
  "expected_canonical_name": "Example Organisation Ltd",
  "expected_domain": "example.org",
  "source_urls": ["https://example.org/about"],
  "reviewers": ["R1", "R2"]
}
```

Opportunity-cycle fixture:

```json
{
  "id": "opp-cycle-001",
  "opportunity_id": "fixture-opportunity-1",
  "cycle_label": "2026",
  "checked_at": "2026-08-22T09:00:00Z",
  "source_verified": true,
  "signals": {
    "explicit_open": true,
    "explicit_closed": false,
    "explicit_paused": false,
    "explicit_rolling": false,
    "application_cta_active": true,
    "opens_at": null,
    "deadline_at": "2026-09-30T23:59:00Z",
    "has_current_cycle_evidence": true,
    "conflict": false
  },
  "expected_application_status": "open",
  "source_urls": ["https://funder.example/2026"],
  "reviewers": ["R1", "R2"]
}
```

- [ ] **Step 1: Write failing fixture-validation tests**

Tests must fail when:

- fixture IDs repeat;
- a P0 fixture lacks two reviewer IDs;
- an expected resolved identity lacks source URLs;
- a confirmed deadline fixture lacks current-cycle source evidence;
- fixture counts are below the configured certification minimum when `certificationMode=true`.

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Shared -- fundingEvaluation.test.ts
```

Expected: FAIL because metric/fixture helpers do not exist yet.

- [ ] **Step 3: Write the exact labelling rubric**

`evaluation/funding/v1/README.md` defines:

```text
identity: resolved / ambiguous / not_found
status: open / closing_soon / rolling / upcoming / closed / paused / unknown
eligibility: eligible / insufficient_information / ineligible
relevance: 0 irrelevant, 1 weak, 2 relevant, 3 highly relevant
```

P0 cases require two reviewers; disagreement is adjudicated and the final label is recorded.

- [ ] **Step 4: Seed implementation fixtures**

Create at least 20 organisations, 40 cycles, 20 eligibility cases and 10 ranking candidate pools. The final PASS gate expands these counts in Task 10.

- [ ] **Step 5: Commit**

```bash
git add evaluation/funding/v1 Shared/src/lib/fundingEvaluation.test.ts
git commit -m "test: define funding intelligence benchmark corpus"
```

---

### Task 2: Implement evaluation metrics correctly

**Files:**
- Create: `Shared/src/lib/fundingEvaluation.ts`
- Modify: `Shared/src/lib/fundingEvaluation.test.ts`

**Interfaces:**

```ts
export function precision(tp: number, fp: number): number;
export function falsePositiveRate(fp: number, tn: number): number;
export function precisionAtK(relevance: number[], k: number): number;
export function ndcgAtK(relevance: number[], k: number): number;
export function sourceCoverage(records: { hasAuthoritativeSource: boolean }[]): number;
export function freshnessViolationRate(records: { violatesFreshness: boolean }[]): number;
```

- [ ] **Step 1: Add failing hand-calculated metric tests**

```ts
expect(precision(8, 2)).toBe(0.8);
expect(falsePositiveRate(1, 99)).toBe(0.01);
expect(precisionAtK([3, 2, 0, 1, 0], 5)).toBe(0.4);
expect(sourceCoverage([{ hasAuthoritativeSource: true }, { hasAuthoritativeSource: false }])).toBe(0.5);
```

`precisionAtK` counts relevance >=2 as useful, so the example above has 2 useful results out of 5 = `0.4`.

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Shared -- fundingEvaluation.test.ts
```

Expected: FAIL because `fundingEvaluation.ts` does not exist.

- [ ] **Step 3: Implement pure metrics**

Zero denominators return `0`, never `NaN` or `Infinity`.

- [ ] **Step 4: Run GREEN**

```bash
npm run test --workspace Shared -- fundingEvaluation.test.ts
npm run typecheck --workspace Shared
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Shared/src/lib/fundingEvaluation.ts Shared/src/lib/fundingEvaluation.test.ts
git commit -m "test: add funding intelligence evaluation metrics"
```

---

### Task 3: Build the TypeScript benchmark runner and evaluate Business Enrichment

**Files:**
- Create: `scripts/funding-intelligence-eval.ts`
- Modify: `package.json`

**Interfaces:**

Run with the repository's Node 22 floor:

```json
{
  "scripts": {
    "eval:funding": "node --experimental-strip-types scripts/funding-intelligence-eval.ts"
  }
}
```

The runner imports with explicit `.ts` extensions:

```ts
import {
  scoreBusinessIdentity,
  selectBusinessIdentity,
} from "../Shared/src/lib/businessIdentity.ts";
```

Output section:

```json
{
  "identity": {
    "auto_proposed": 72,
    "correct_auto_proposed": 72,
    "precision": 1,
    "ambiguous_withheld_rate": 1,
    "wrong_auto_selections": 0
  }
}
```

- [ ] **Step 1: Prove runner RED**

```bash
npm run eval:funding
```

Expected: FAIL because the script does not exist.

- [ ] **Step 2: Implement fixture loading and production identity imports**

The runner must not reimplement name similarity or confidence thresholds.

- [ ] **Step 3: Compute identity precision and ambiguity withholding**

Wrong auto-selection count is a hard failure in certification mode.

- [ ] **Step 4: Run GREEN for the seeded corpus**

```bash
npm run eval:funding
```

Expected: command exits 0 only if the seeded fixture thresholds configured for implementation mode are met.

- [ ] **Step 5: Commit**

```bash
git add scripts/funding-intelligence-eval.ts package.json
git commit -m "test: evaluate business identity precision"
```

---

### Task 4: Evaluate Opportunity Status classification and freshness

**Files:**
- Modify: `scripts/funding-intelligence-eval.ts`
- Use exactly: `Shared/src/lib/fundingStatus.ts`

**Interfaces:**

Import:

```ts
import {
  classifyFundingStatus,
  isStatusFresh,
} from "../Shared/src/lib/fundingStatus.ts";
```

- [ ] **Step 1: Add a failing status-evaluation section**

Before implementation, require the report to contain:

```json
{
  "status": {
    "primary_precision": 0,
    "historical_cycle_contamination": 0,
    "stale_primary_records": 0
  }
}
```

with real computed values, not constants.

- [ ] **Step 2: Run and verify RED**

```bash
npm run eval:funding
```

Expected: FAIL because status evaluation/report fields are not implemented.

- [ ] **Step 3: Evaluate every cycle fixture through `classifyFundingStatus`**

Report per-class precision plus combined precision for predicted `open|closing_soon|rolling`.

- [ ] **Step 4: Add historical-cycle contamination check**

Any fixture where prior-cycle evidence causes current-cycle `open|closing_soon|rolling` prediction increments `historical_cycle_contamination` and fails the gate.

- [ ] **Step 5: Add freshness violations**

Use the production `isStatusFresh` helper. Primary records past SLA fail.

- [ ] **Step 6: Run GREEN and commit**

```bash
npm run eval:funding
git add scripts/funding-intelligence-eval.ts
git commit -m "test: evaluate current funding cycle accuracy"
```

---

### Task 5: Evaluate hard eligibility false positives using the production Recommendation Engine

**Files:**
- Modify: `scripts/funding-intelligence-eval.ts`
- Use exactly: `Frontend/src/lib/funding/recommendationEngine.ts`

**Interfaces:**

Import:

```ts
import {
  recommendOpportunity,
} from "../Frontend/src/lib/funding/recommendationEngine.ts";
```

- [ ] **Step 1: Add failing eligibility report assertions**

Required output:

```json
{
  "eligibility": {
    "labelled_ineligible": 70,
    "false_eligible": 1,
    "false_positive_rate": 0.0142857,
    "abstentions": 10
  }
}
```

- [ ] **Step 2: Run RED**

```bash
npm run eval:funding
```

Expected: FAIL until the evaluator calls `recommendOpportunity` on eligibility fixtures.

- [ ] **Step 3: Evaluate production hard rules only**

`possibly_eligible` and `insufficient_information` count as abstentions, not false positives. A fixture labelled hard-ineligible but predicted `eligible` is a false positive.

- [ ] **Step 4: Run GREEN and commit**

```bash
npm run eval:funding
git add scripts/funding-intelligence-eval.ts
git commit -m "test: evaluate funding eligibility false positives"
```

---

### Task 6: Evaluate recommendation relevance at Top 5 using production ranking

**Files:**
- Modify: `scripts/funding-intelligence-eval.ts`
- Use exactly: `Frontend/src/lib/funding/recommendationEngine.ts`

**Interfaces:**

Import:

```ts
import {
  rankRecommendations,
} from "../Frontend/src/lib/funding/recommendationEngine.ts";
```

Each `relevance.json` fixture contains one profile, a candidate pool and a map of opportunity IDs to human relevance `0..3`.

- [ ] **Step 1: Add failing ranking-report assertion**

Require `precision_at_5`, `ndcg_at_5`, and per-segment rows.

- [ ] **Step 2: Run RED**

```bash
npm run eval:funding
```

Expected: FAIL until ranking evaluation exists.

- [ ] **Step 3: Rank each candidate pool with `rankRecommendations`**

Map the top five IDs back to human relevance labels; calculate Precision@5 and NDCG@5.

- [ ] **Step 4: Add segment readouts**

Exactly these initial segments:

```text
country
organisation_type
business_stage
preferred_funding_type
```

Do not let a high global average hide a zero/very-low segment; report every segment with sample count.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm run eval:funding
git add scripts/funding-intelligence-eval.ts
git commit -m "test: evaluate top funding recommendation relevance"
```

---

### Task 7: Add provenance, deadline and link-quality metrics

**Files:**
- Modify: `scripts/funding-intelligence-eval.ts`

**Interfaces:**

Report fields:

```text
primary_authoritative_source_coverage
confirmed_deadline_source_coverage
ai_primary_promotion_violations
broken_primary_link_rate
```

- [ ] **Step 1: Add failing provenance report assertions**
- [ ] **Step 2: Run RED**

```bash
npm run eval:funding
```

- [ ] **Step 3: Measure authoritative source coverage**

A primary record counts covered only if the canonical recommendation has authoritative source evidence under the production trust contract.

- [ ] **Step 4: Measure deadline provenance**

Every primary `deadline_status=confirmed` record must reference evidence for the same current cycle. Required coverage = 1.0.

- [ ] **Step 5: Measure AI promotion violations**

Any `discovery_source=ai_assisted` or `verification_status!=verified` record classified into primary Apply Now is a hard failure.

- [ ] **Step 6: Add explicit live-link mode**

```bash
ALLOW_FUNDING_LIVE_EVAL=1 npm run eval:funding -- --live-links
```

Without `ALLOW_FUNDING_LIVE_EVAL=1`, `--live-links` must exit non-zero before making a request. Live mode uses the same bounded safe-fetch helper and reports broken links; it is never called by normal CI.

- [ ] **Step 7: Run deterministic GREEN and commit**

```bash
npm run eval:funding
git add scripts/funding-intelligence-eval.ts
git commit -m "test: evaluate funding provenance and deadline evidence"
```

---

### Task 8: Generate machine-readable and human-readable certification reports

**Files:**
- Modify: `scripts/funding-intelligence-eval.ts`
- Create: `docs/production-readiness/evidence/funding-intelligence-certification.md`
- Create: `docs/product/FUNDING-INTELLIGENCE-EVALUATION.md`

**Interfaces:**

Machine report path:

```text
artifacts/funding-intelligence-eval.json
```

Report must include:

```text
benchmark_version
commit_sha
run_date
fixture_counts
metric values
thresholds
PASS/FAIL per metric
live_checks_ran boolean
external blockers
```

- [ ] **Step 1: Add failing report-output check**

```bash
rm -f artifacts/funding-intelligence-eval.json
npm run eval:funding
test -f artifacts/funding-intelligence-eval.json
```

Expected before implementation: final `test -f` fails.

- [ ] **Step 2: Write deterministic JSON report from computed metrics**

- [ ] **Step 3: Create evaluation methodology doc**

Document fixture sources, human labelling, metric formulas, versioning and live-check separation.

- [ ] **Step 4: Create certification evidence doc**

When live checks are skipped, the report may state `REPOSITORY_BENCHMARK: PASS` but production live certification remains `BLOCKED_EXTERNAL`; never emit `PRODUCTION: PASS` from fixture-only evidence.

- [ ] **Step 5: Verify and commit**

```bash
npm run eval:funding
test -f artifacts/funding-intelligence-eval.json
git add scripts/funding-intelligence-eval.ts docs/product/FUNDING-INTELLIGENCE-EVALUATION.md docs/production-readiness/evidence/funding-intelligence-certification.md
git commit -m "docs: generate funding intelligence certification evidence"
```

---

### Task 9: Add an independent GitHub Actions benchmark gate

**Files:**
- Create: `.github/workflows/funding-intelligence-eval.yml`

**Interfaces:**

Workflow triggers on changes to:

```text
Frontend/src/lib/funding/**
Shared/src/lib/businessIdentity.ts
Shared/src/lib/fundingStatus.ts
Shared/src/lib/fundingEvaluation.ts
supabase/functions/aggregate-funding/**
supabase/functions/funding-source-refresh/**
evaluation/funding/**
scripts/funding-intelligence-eval.ts
```

Permissions:

```yaml
permissions:
  contents: read
```

- [ ] **Step 1: Create Node 22 workflow**

Steps:

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: npm
- run: npm ci --no-audit --no-fund
- run: npm run eval:funding
- uses: actions/upload-artifact@v4
  with:
    name: funding-intelligence-eval
    path: artifacts/funding-intelligence-eval.json
```

- [ ] **Step 2: Verify no live-network flag/secret exists in the workflow**

```bash
grep -n "ALLOW_FUNDING_LIVE_EVAL\|--live-links\|BRAVE_SEARCH_API_KEY" .github/workflows/funding-intelligence-eval.yml && exit 1 || true
```

Expected: exit 0 because none of the prohibited live-network terms exist.

- [ ] **Step 3: Prove the gate can fail**

On the feature branch only, temporarily change one known-correct expected fixture label to a wrong P0 value, commit/push, observe the evaluation workflow fail, then restore the fixture in a new commit and observe the workflow pass. Do not merge the deliberately bad commit.

- [ ] **Step 4: Commit the restored green workflow/fixtures**

```bash
git add .github/workflows/funding-intelligence-eval.yml evaluation/funding/v1
git commit -m "ci: gate funding intelligence accuracy"
```

- [ ] **Step 5: Record branch-protection follow-up**

Once the check name is observed green on GitHub, document that `funding-intelligence-eval` should become a required `main` check. If the connector cannot change branch protection, record it as an external repository-setting action.

---

### Task 10: Reach minimum certification corpus and run release gate

**Files:**
- Expand: `evaluation/funding/v1/organisations.json`
- Expand: `evaluation/funding/v1/opportunity-cycles.json`
- Expand: `evaluation/funding/v1/eligibility.json`
- Expand: `evaluation/funding/v1/relevance.json`
- Modify: `docs/production-readiness/evidence/funding-intelligence-certification.md`
- Modify: all four engine manuals with benchmark version/results.

- [ ] **Step 1: Expand to >=100 organisation fixtures**

Include companies, nonprofits/NGOs, social enterprises, associations, multiple stages/countries, ambiguous names and no-public-footprint cases.

- [ ] **Step 2: Expand to >=200 opportunity-cycle fixtures**

Include rolling, contradictory sources, historical pages, changed deadline, future opening, source outage, stale open and closed application portal with a generic live programme page.

- [ ] **Step 3: Reach robust eligibility/ranking coverage**

Minimum:

```text
>=150 labelled organisation-opportunity eligibility pairs
>=50 ranking candidate pools
```

- [ ] **Step 4: Confirm two human reviewers for every P0 identity/status/eligibility label**

Run fixture validation:

```bash
npm run test --workspace Shared -- fundingEvaluation.test.ts
```

Expected: PASS in certification mode.

- [ ] **Step 5: Run full deterministic certification**

```bash
npm ci
npm run verify
npm run eval:funding
```

Expected: exit 0 and every repository P0 metric meets its fixed threshold.

- [ ] **Step 6: Run staging/live source/link certification when the real environment is available**

```bash
ALLOW_FUNDING_LIVE_EVAL=1 npm run eval:funding -- --live-links
```

Expected for production certification: broken primary link rate <1% and all live-source freshness checks satisfy the engine SLA.

- [ ] **Step 7: Record exact release state**

If the deployed provider/Supabase environment is unavailable, repository benchmark may PASS while production certification remains `BLOCKED_EXTERNAL`.

- [ ] **Step 8: Commit final evidence**

```bash
git add evaluation/funding/v1 docs/product docs/production-readiness/evidence/funding-intelligence-certification.md artifacts/funding-intelligence-eval.json
git commit -m "docs: certify funding intelligence accuracy"
```

## Plan PASS gate

The paid `Open for you` claim is approved for production only when every P0 metric meets its fixed threshold on the minimum corpus, deterministic repository gates are green, and the staging/live freshness/link checks pass against the deployed Cresciva environment. No metric may be waived merely to meet a launch date.
