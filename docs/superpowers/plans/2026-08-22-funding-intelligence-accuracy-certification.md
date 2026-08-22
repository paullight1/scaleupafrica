# Funding Intelligence Accuracy Certification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a repeatable evidence gate proving that Cresciva's business identity, current-cycle status, eligibility and top recommendations meet the accuracy standard required for the paid funding promise.

**Architecture:** Build a versioned benchmark corpus with human-labelled organisation identities, opportunity cycles and eligibility/relevance judgments. Run deterministic evaluation code in CI against frozen fixtures; run a separate live/staging source-freshness certification against deployed providers. Release claims are driven by measured thresholds, not by unit-test count or anecdotal examples.

**Tech Stack:** TypeScript/Node 22, Vitest, JSON fixtures, existing Recommendation/Search/Status/Identity engines, GitHub Actions, Markdown evidence reports.

**Spec:** `docs/superpowers/specs/2026-08-22-business-to-funding-intelligence-design.md`

## Global Constraints

- Benchmark labels are human/source-grounded; an LLM cannot grade its own production outputs.
- Minimum certification corpus: 100 organisation profiles and 200 opportunity-cycle records.
- Primary source evidence must be retained as URL + bounded excerpt/fact metadata; do not copy entire third-party pages into fixtures.
- Benchmark must include positive, negative, ambiguous and unknown cases.
- No sensitive demographic inference fixtures unless a user-supplied field is explicitly needed to test a legitimate eligibility rule.
- Paid `Open for you` production claim remains gated until all P0 thresholds pass.
- Evaluation failures cannot be waived by changing the metric after seeing the result; metric/version changes require documented rationale and a new benchmark version.

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
- `evaluation/funding/v1/relevance.json` — human relevance judgments for ranking metrics.
- `evaluation/funding/v1/README.md` — labelling rubric and provenance rules.
- `Shared/src/lib/fundingEvaluation.ts` — metrics.
- `Shared/src/lib/fundingEvaluation.test.ts` — metric correctness tests.
- `scripts/funding-intelligence-eval.mjs` — deterministic benchmark runner.
- `docs/product/FUNDING-INTELLIGENCE-EVALUATION.md` — evaluation methodology.
- `docs/production-readiness/evidence/funding-intelligence-certification.md` — current release evidence.
- `.github/workflows/funding-intelligence-eval.yml` — benchmark gate.

**Modify**

- `package.json` — add `eval:funding` script.
- `.github/workflows/ci.yml` — optionally require deterministic benchmark after runtime is proven acceptable; do not add live-network calls to normal CI.
- `docs/product/RECOMMENDATION-ENGINE.md` — link to measured ranking gate.
- `docs/product/OPPORTUNITY-SEARCH-ENGINE.md` — link to source/status accuracy gate.
- `docs/product/BUSINESS-ENRICHMENT-ENGINE.md` — link identity precision gate.
- `docs/product/OPPORTUNITY-STATUS-ENGINE.md` — link current-cycle precision gate.

---

### Task 1: Define versioned benchmark schemas and labelling rubric

**Files:**
- Create: `evaluation/funding/v1/README.md`
- Create: `evaluation/funding/v1/organisations.json`
- Create: `evaluation/funding/v1/opportunity-cycles.json`
- Create: `evaluation/funding/v1/eligibility.json`
- Create: `evaluation/funding/v1/relevance.json`
- Test: `Shared/src/lib/fundingEvaluation.test.ts`

**Interfaces:**

Organisation fixture example:

```json
{
  "id": "org-001",
  "input_name": "Example Organisation",
  "country_hint": "Nigeria",
  "expected_state": "resolved",
  "expected_canonical_name": "Example Organisation Ltd",
  "expected_domain": "example.org",
  "source_urls": ["https://example.org/about"]
}
```

Opportunity-cycle fixture example:

```json
{
  "id": "opp-cycle-001",
  "opportunity_id": "fixture-opportunity-1",
  "cycle_label": "2026",
  "checked_at": "2026-08-22T09:00:00Z",
  "source_verified": true,
  "signals": {
    "explicit_open": true,
    "application_cta_active": true,
    "deadline_at": "2026-09-30T23:59:00Z",
    "has_current_cycle_evidence": true,
    "conflict": false
  },
  "expected_application_status": "open"
}
```

- [ ] **Step 1: Write failing fixture-validation tests**

Validate IDs unique, required provenance present and minimum counts enforceable.

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Shared -- fundingEvaluation.test.ts
```

- [ ] **Step 3: Write labelling rubric**

Define how human reviewers label:

```text
identity: resolved / ambiguous / not_found
status: open / closing_soon / rolling / upcoming / closed / paused / unknown
eligibility: eligible / insufficient_information / ineligible
relevance: 0 irrelevant, 1 weak, 2 relevant, 3 highly relevant
```

Require two reviewers for all P0 test cases; disagreement is adjudicated and recorded.

- [ ] **Step 4: Seed initial fixtures**

Start with at least 20 organisations and 40 cycles during implementation, then expand to minimum certification counts before PASS.

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
precision(tp, fp): number
falsePositiveRate(fp, tn): number
precisionAtK(labels, k): number
ndcgAtK(relevance, k): number
sourceCoverage(records): number
freshnessViolationRate(records): number
```

- [ ] **Step 1: Write failing metric unit tests with hand-calculated answers**

Example:

```ts
expect(precision(8, 2)).toBe(0.8);
expect(precisionAtK([3, 2, 0, 1, 0], 5)).toBe(0.6);
```

Define `useful` as relevance >=2 for Precision@K.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement pure metrics**

Handle zero denominators explicitly and never return NaN.

- [ ] **Step 4: Run GREEN**

```bash
npm run test --workspace Shared -- fundingEvaluation.test.ts
```

- [ ] **Step 5: Commit**

---

### Task 3: Evaluate Business Enrichment identity resolution

**Files:**
- Create: `scripts/funding-intelligence-eval.mjs`
- Modify: `package.json`

**Interfaces:**

Runner section output:

```json
{
  "identity": {
    "auto_proposed": 72,
    "correct_auto_proposed": 72,
    "precision": 1,
    "ambiguous_withheld_rate": 1
  }
}
```

- [ ] **Step 1: Write a failing runner smoke test or invoke against fixtures before implementation**

```bash
npm run eval:funding
```

Expected: FAIL because script does not exist.

- [ ] **Step 2: Import the production `scoreBusinessIdentity/selectBusinessIdentity` functions**

Do not duplicate scoring in the evaluator.

- [ ] **Step 3: Compute automatic-identity precision and ambiguity withholding**

- [ ] **Step 4: Fail process when wrong auto-selection >0 in the acceptance corpus**

- [ ] **Step 5: Commit**

```bash
git add scripts/funding-intelligence-eval.mjs package.json
git commit -m "test: evaluate business identity precision"
```

---

### Task 4: Evaluate opportunity status classification and freshness

**Files:**
- Modify: `scripts/funding-intelligence-eval.mjs`
- Use: `Shared/src/lib/fundingStatus.ts`

- [ ] **Step 1: Add failing status-evaluation assertions**

Runner must report per-class precision and combined primary status precision for `open|closing_soon|rolling`.

- [ ] **Step 2: Run benchmark and confirm initial failure/metrics output**

- [ ] **Step 3: Evaluate exact production classifier against all cycle fixtures**

- [ ] **Step 4: Add explicit historical-cycle contamination metric**

Any fixture where a prior-cycle deadline causes a current-cycle OPEN classification is a hard failure.

- [ ] **Step 5: Add stale primary-output metric**

Expected `0` stale OPEN records past SLA.

- [ ] **Step 6: Commit**

---

### Task 5: Evaluate hard eligibility false positives

**Files:**
- Modify: `scripts/funding-intelligence-eval.mjs`
- Use: `Frontend/src/lib/funding/recommendationEngine.ts` or move engine-neutral eligibility logic to Shared if import boundaries require it.

**Interfaces:**

Report:

```json
{
  "eligibility": {
    "eligible_cases": 80,
    "ineligible_cases": 70,
    "false_positive_rate": 0.014
  }
}
```

- [ ] **Step 1: Add failing eligibility benchmark section**
- [ ] **Step 2: Evaluate production hard rules only**
- [ ] **Step 3: Treat `possibly_eligible/insufficient_information` as abstentions, not false positives**
- [ ] **Step 4: Fail when an expected hard-ineligible case is labelled eligible**
- [ ] **Step 5: Commit**

---

### Task 6: Evaluate recommendation relevance at Top 5

**Files:**
- Modify: `scripts/funding-intelligence-eval.mjs`
- Use: production recommendation ranking.

- [ ] **Step 1: Add ranking fixtures with a candidate pool per organisation**

Each fixture must contain enough negative candidates to make ranking meaningful.

- [ ] **Step 2: Compute Precision@5 and NDCG@5**

Primary release metric:

```text
Precision@5 >= 0.80
```

- [ ] **Step 3: Add per-segment readout**

At minimum:

```text
country
organisation_type
business_stage
funding_type
```

This is to catch a high average hiding a broken segment.

- [ ] **Step 4: Commit**

---

### Task 7: Add provenance, deadline and link-quality metrics

**Files:**
- Modify: `scripts/funding-intelligence-eval.mjs`

- [ ] **Step 1: Measure authoritative source coverage for primary recommendations**

Required >=95%.

- [ ] **Step 2: Measure deadline provenance**

Every `deadline_status=confirmed` primary record must have status/source evidence for the same current cycle. Required 100%.

- [ ] **Step 3: Measure AI-promotion violations**

Any AI-assisted/unverified record in primary Apply Now = hard failure.

- [ ] **Step 4: Add live/staging broken-link probe mode**

This mode is not normal CI. It performs bounded HEAD/GET checks against primary official URLs and requires <1% broken links.

Command shape:

```bash
npm run eval:funding -- --live-links
```

Require explicit `ALLOW_FUNDING_LIVE_EVAL=1` to prevent accidental network calls.

- [ ] **Step 5: Commit**

---

### Task 8: Generate human-readable and machine-readable certification reports

**Files:**
- Create: `docs/production-readiness/evidence/funding-intelligence-certification.md`
- Modify: `scripts/funding-intelligence-eval.mjs`

**Interfaces:**

Machine report:

```text
artifacts/funding-intelligence-eval.json
```

Markdown contains:

```text
benchmark version
commit SHA
run date
counts
metrics vs thresholds
PASS/FAIL per metric
known external/live blockers
```

- [ ] **Step 1: Add failing report-output test/command assertion**
- [ ] **Step 2: Produce deterministic JSON report**
- [ ] **Step 3: Render/update Markdown evidence from the JSON**
- [ ] **Step 4: Verify no claims are emitted as PASS when live checks were skipped**
- [ ] **Step 5: Commit**

---

### Task 9: Add GitHub Actions benchmark gate

**Files:**
- Create: `.github/workflows/funding-intelligence-eval.yml`
- Modify: `package.json`

**Interfaces:**

Workflow runs on changes to:

```text
Frontend/src/lib/funding/**
Shared/src/lib/businessIdentity.ts
Shared/src/lib/fundingStatus.ts
supabase/functions/aggregate-funding/**
supabase/functions/funding-source-refresh/**
evaluation/funding/**
scripts/funding-intelligence-eval.mjs
```

- [ ] **Step 1: Create Node 22 read-only workflow**

Permissions:

```yaml
contents: read
```

- [ ] **Step 2: Run locked install + deterministic benchmark**

```yaml
- run: npm ci --no-audit --no-fund
- run: npm run eval:funding
```

No live third-party network calls in this workflow.

- [ ] **Step 3: Upload JSON report artifact**

- [ ] **Step 4: Verify a deliberately bad fixture causes workflow failure before restoring it**

This is required evidence that the gate can actually catch regressions.

- [ ] **Step 5: Commit**

---

### Task 10: Reach minimum certification corpus and run release gate

**Files:**
- Expand: `evaluation/funding/v1/*.json`
- Modify: `docs/production-readiness/evidence/funding-intelligence-certification.md`
- Create: `docs/product/FUNDING-INTELLIGENCE-EVALUATION.md`

- [ ] **Step 1: Expand to >=100 organisation fixtures**

Include:

- companies;
- nonprofits/NGOs;
- social enterprises;
- associations;
- early/growth/scale businesses;
- multiple African countries;
- ambiguous names;
- no-public-footprint cases.

- [ ] **Step 2: Expand to >=200 opportunity-cycle fixtures**

Include every status and at least:

- rolling;
- contradictory sources;
- historic pages;
- changed deadline;
- future opening date;
- source outage;
- stale open;
- closed application portal with generic live programme page.

- [ ] **Step 3: Ensure >=2 human reviewers for P0 labels**

Record reviewer IDs/initials in metadata, not personal secrets.

- [ ] **Step 4: Run deterministic certification**

```bash
npm ci
npm run verify
npm run eval:funding
```

- [ ] **Step 5: Run staging/live source/link certification when real environment is available**

```bash
ALLOW_FUNDING_LIVE_EVAL=1 npm run eval:funding -- --live-links
```

- [ ] **Step 6: Record exact PASS/FAIL**

If live provider/Supabase deployment is unavailable, repository benchmark may PASS while production certification remains `BLOCKED_EXTERNAL`.

- [ ] **Step 7: Update all engine manuals with benchmark version and measured results**

## Plan PASS gate

The paid `Open for you` claim is approved for production only when every P0 metric meets its threshold on the minimum corpus, deterministic repository gates are green, and the live/staging freshness/link checks pass against the deployed Cresciva environment. No metric may be waived merely to meet a launch date.
