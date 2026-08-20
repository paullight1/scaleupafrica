# CI, Release Governance & Branch Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure no Cresciva change can reach `main` or production without deterministic validation of Frontend, AdminPanel, Shared, Backend, tests, types and production assembly.

**Architecture:** Add one root verification contract, enforce it in GitHub Actions on pull requests and `main`, then protect `main` with required checks. Vercel remains the deployment platform for the assembled SPA artifact, but deployment success is downstream of—not a substitute for—the repository quality gate.

**Tech Stack:** npm workspaces, GitHub Actions, TypeScript, ESLint, Vitest, Vite, NestJS, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-20-cresciva-production-readiness-design.md`

## Global Constraints

- Node.js runtime floor remains Node 20+.
- `package-lock.json` is the canonical dependency lockfile.
- CI installs with `npm ci`, never `npm install`.
- Backend build/typecheck/lint/test are mandatory even when API cutover is disabled.
- No deployment secret is committed to the repository.
- `main` must require successful CI before merge after the workflow is proven green.
- Direct pushes to `main` should be disabled for normal development once branch protection is enabled.

---

### Task 1: Create one root verification contract

**Files:**
- Modify: `package.json`
- Modify as needed: `Frontend/package.json`
- Modify as needed: `AdminPanel/package.json`
- Modify as needed: `Shared/package.json`
- Existing: `Backend/package.json`

**Interfaces:**
- Produces root scripts: `lint`, `typecheck`, `test`, `build`, `build:api`, `verify`.

- [ ] **Step 1: Inventory workspace scripts**

Run:

```bash
npm pkg get scripts --workspaces
```

Confirm which workspaces already expose `lint`, `test`, `build`, and `typecheck`.

- [ ] **Step 2: Add explicit typecheck scripts where absent**

For Vite/React workspaces, use:

```json
"typecheck": "tsc -p tsconfig.app.json --noEmit"
```

For Shared, use its existing tsconfig path and `tsc --noEmit`. Preserve Backend's current `tsc -p tsconfig.json --noEmit`.

- [ ] **Step 3: Make root lint cover all lintable workspaces**

Target behavior:

```json
"lint": "npm run lint --workspace Frontend && npm run lint --workspace AdminPanel && npm run lint --workspace Backend"
```

If Shared has its own lint script, include it explicitly; do not rely on incidental compilation through Frontend.

- [ ] **Step 4: Add root typecheck and verify**

Target:

```json
"typecheck": "npm run typecheck --workspaces --if-present",
"verify": "npm run lint && npm run typecheck && npm run test && npm run build && npm run build:api"
```

`npm run build` continues to assemble the public/admin Vercel artifact. `npm run build:api` independently proves Backend production compilation.

- [ ] **Step 5: Run from a clean dependency install**

```bash
rm -rf node_modules Frontend/node_modules AdminPanel/node_modules Shared/node_modules Backend/node_modules
npm ci
npm run verify
```

Expected: zero exit status.

- [ ] **Step 6: Commit**

Stage only package manifests/lockfile changes required by the script work.

### Task 2: Add GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces required status check named `CI / verify`.

- [ ] **Step 1: Write the workflow**

Use this shape:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: verify
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run verify
```

Do not put Vercel, Supabase, Paystack, Resend or database production secrets in this baseline verification job.

- [ ] **Step 2: Verify workflow syntax locally**

At minimum inspect with a YAML parser; if `actionlint` is available, run it. Then push the branch and verify a real workflow run completes.

- [ ] **Step 3: Confirm artifact assembly**

After CI build, verify the production build contains both:

```text
Frontend/dist/index.html
Frontend/dist/admin/index.html
```

and that `npm run build:api` produced the expected Backend `dist` entry point.

- [ ] **Step 4: Commit**

```bash
git add -- .github/workflows/ci.yml
git commit -m "ci: verify every Cresciva workspace"
```

### Task 3: Add lightweight dependency and secret checks

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.gitignore` if audit reveals gaps

**Interfaces:**
- CI must fail on committed high-confidence secrets and on lockfile/install drift.

- [ ] **Step 1: Add `npm audit` as an evidence check, not an automatic destructive upgrader**

Run in CI:

```bash
npm audit --omit=dev --audit-level=high
```

If ecosystem false positives or accepted transitive risks make this unsuitable as a hard gate, split it into a clearly visible non-blocking job and record the accepted finding in evidence. Never run `npm audit fix --force` automatically.

- [ ] **Step 2: Add a secret scanning workflow/tool with no write permissions**

Use a maintained scanner such as Gitleaks in read-only CI. The scanner configuration may ignore known publishable Supabase keys, but must never blanket-ignore `.env` files.

- [ ] **Step 3: Verify ignored secret files**

At minimum ensure these patterns remain ignored where server-side secrets live:

```gitignore
Backend/.env
supabase/.env
.env
.env.local
.env.*.local
```

Committed development env files may contain only intentionally public `VITE_` values.

### Task 4: Protect `main`

**Files:**
- GitHub repository settings; no source file required.
- Create/update: `docs/production-readiness/evidence/environment-inventory.md`

**Interfaces:**
- Required check: `CI / verify` (use the exact status name GitHub exposes after the first successful run).

- [ ] **Step 1: Wait for one successful CI run on a branch/PR**

Do not configure a required check that has never existed; GitHub cannot enforce a nonexistent status reliably.

- [ ] **Step 2: Enable branch protection/ruleset**

Required settings:

- require a pull request before merging;
- require the CI verification status;
- require branch to be up to date before merge when feasible;
- block force pushes to `main`;
- block deletion of `main`;
- do not allow routine bypass of required checks.

For a solo-maintainer repository, one approval can be optional initially, but the status check is mandatory.

- [ ] **Step 3: Prove protection**

Create a deliberately failing test on a temporary branch and confirm merge is blocked. Revert that test after proof.

- [ ] **Step 4: Record evidence**

Record the ruleset/protection name, required check name, date verified, and test PR number in the evidence document. Do not record tokens.

### Task 5: Separate preview validation from production promotion

**Files:**
- Modify as needed: `vercel.json`
- Create/update: `docs/production-readiness/evidence/environment-inventory.md`

- [ ] **Step 1: Confirm Git integration creates preview deployments for non-production branches**

The preview must use preview-safe environment values and must never receive live Paystack secrets unless explicitly required for a protected test environment.

- [ ] **Step 2: Define production promotion rule**

Production deploy occurs only from protected `main` after CI passes. If Vercel's Git production branch is `main`, document that. If production promotion is manual, document the exact promotion step and actor.

- [ ] **Step 3: Verify rollback availability**

Document the last-known-good deployment identification method and Vercel rollback/promotion procedure.

## Phase 2 Definition of Done

- `npm ci && npm run verify` passes from a clean checkout.
- Backend participates in lint, typecheck, test and build gates.
- GitHub Actions runs on PRs and `main`.
- The required CI check has passed at least once.
- `main` is protected and cannot merge failing verification.
- Secret/dependency checks are visible.
- Production deployment occurs only after the repository gate.
- Rollback procedure is documented.
- Evidence ends with `PHASE 2 RELEASE GATE: PASS`.