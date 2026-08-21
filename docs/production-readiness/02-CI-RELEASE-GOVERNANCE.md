# CI, Release Governance & Branch Protection Implementation Plan

> **For agentic workers:** use the Superpowers executing-plans and verification-before-completion workflows for any further changes.

**Goal:** Ensure no Cresciva change can reach `main` or production without deterministic validation of Frontend, AdminPanel, Shared, Backend, Supabase Edge Functions, tests, types and production assembly.

**Architecture:** One root verification contract runs in GitHub Actions. Vercel deployment success is downstream of—not a substitute for—the repository quality gate. Production secrets are never injected into baseline CI. Branch protection becomes mandatory once the first real all-green CI check is observed.

**Tech Stack:** npm workspaces, GitHub Actions, Node 22+, TypeScript, ESLint, Vitest, Vite, NestJS, Deno, Vercel.

## Global constraints

- [x] Node.js runtime floor is Node 22+; current Supabase packages require it.
- [x] `package-lock.json` is the canonical dependency lockfile.
- [x] CI installs with `npm ci`.
- [x] Backend lint/typecheck/test/build participate even when API cutover is disabled.
- [x] Active Supabase Edge Function entry points are Deno-checked in CI.
- [x] No Bachs/Supabase/Resend/database production secrets are required by the baseline CI job.
- [ ] `main` must require the successful verification status before merge.
- [ ] Routine direct pushes/force pushes to `main` must be blocked after protection is enabled.

---

## Task 1 — Root verification contract

**Files:** root/workspace `package.json` files.

Repository contract now exposes:

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run build:api
npm run verify
```

- [x] Frontend has explicit typecheck.
- [x] AdminPanel has explicit typecheck.
- [x] Shared has explicit typecheck.
- [x] Backend exposes lint/typecheck/test/build.
- [x] Root lint covers Frontend + AdminPanel + Backend.
- [x] Root typecheck runs all workspace typechecks where present.
- [x] Root tests run every workspace test suite.
- [x] Root build assembles Frontend and AdminPanel.
- [x] Root `build:api` independently proves Backend production compilation.
- [x] Root `verify` composes all repository gates.
- [x] Real GitHub Actions execution has proven the workspace gate on the production-readiness branch, including the recommendation/search engine test suites and production builds.

Observed engine-workspace evidence includes:

```text
Frontend: 312 tests passed
Shared:    85 tests passed
Admin:     23 tests passed
Backend:   67 tests passed
```

## Task 2 — GitHub Actions CI

**File:** `.github/workflows/ci.yml`

- [x] Workflow triggers for pull requests and pushes.
- [x] Read-only baseline permissions, with only the read permission needed by Gitleaks PR enumeration.
- [x] Concurrency cancels stale runs.
- [x] Node 22 setup with npm cache.
- [x] Deno setup.
- [x] `npm ci`.
- [x] `npm run verify`.
- [x] Deno checks:
  - `bachs-init`
  - `bachs-verify`
  - `bachs-webhook`
  - `payment-reconciliation`
  - `aggregate-funding`
  - `send-email`
  - `email-unsubscribe`
- [x] A focused branch-head diagnostic has proven all seven active Edge Function entry points pass `deno check` after the Edge typing fixes.
- [x] Artifact assertions are configured for public SPA, admin SPA and Backend entrypoint.
- [ ] The final normal PR workflow on the exact documentation-reconciled deliverable head must be fully green before the repository CI gate is called PASS.

Expected required job/status is the GitHub Actions `CI / verify` job (use the exact status GitHub exposes after the final PR run).

## Task 3 — Dependency and secret checks

- [x] Production dependency audit runs visibly with `npm audit --omit=dev --audit-level=high`.
- [x] The earlier high-severity Drizzle and Nanoid findings were remediated and the current high-severity audit job is green.
- [x] Gitleaks scans full git history and is green on the engine branch.
- [x] Root `.env`, `.env.local`, environment-local variants, `Backend/.env` and `supabase/.env` are ignored.
- [x] Tracked Frontend/Admin `.env` files contain only intentionally browser-public Supabase configuration.
- [x] No CI step receives Bachs live keys, Bachs product IDs, Supabase service-role keys or Resend production secrets.

## Task 4 — Protect `main`

Current external evidence:

```text
main protected: false
required status checks: off
```

The available GitHub connector can read this state but does not expose a branch-protection/ruleset mutation action.

Required settings after the final successful CI run exists:

- [ ] require pull request before merge;
- [ ] require the exact CI verification status;
- [ ] require branch up-to-date before merge where practical;
- [ ] block force pushes;
- [ ] block branch deletion;
- [ ] disable routine bypass.

### Proof requirement

After protection is configured, intentionally create a temporary failing-PR check and confirm GitHub blocks merge; remove/revert the deliberate failure afterwards.

## Task 5 — Preview vs production promotion

Repository production rule:

- PR/feature branch -> CI + preview deployment only.
- Protected `main` after required CI -> production-eligible.

External Vercel proof is currently unavailable because the connected Vercel scope did not expose the Cresciva project. This does **not** prove Cresciva has no Vercel deployment; it means the connected scope cannot inspect it.

Before the release gate becomes PASS:

- [ ] identify the actual Cresciva Vercel project;
- [ ] confirm Git preview deployments for non-production branches;
- [ ] confirm Bachs **sandbox** credentials/products are used only in a protected staging environment if payments are exercised on preview;
- [ ] confirm live Bachs secrets/products are not exposed to ordinary previews;
- [ ] confirm production branch/promotion rule;
- [ ] perform/document rollback to last-known-good deployment.

## Phase 2 release state

Repository CI implementation: **implemented and actively evidenced**.

Remaining release evidence:

1. final normal PR CI green on the exact deliverable head;
2. `main` branch protection requiring that check;
3. Vercel preview/production/rollback verification on the actual project.

`PHASE 2 RELEASE GATE: BLOCKED_EXTERNAL`
