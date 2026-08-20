# Web Quality, Accessibility, Performance & SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Cresciva's public/member/admin web experience reliable on mobile networks and assistive technology, progressively stricter in TypeScript, and correct for search/social crawlers before launch.

**Architecture:** Preserve the current Vite/React/TanStack/shared-component structure and route-level lazy loading. Add measurable quality budgets, automate accessibility/route regressions, ratchet TypeScript by workspace or file family instead of a destabilizing all-at-once rewrite, and ensure crawler-visible metadata is correct without depending on client-side JavaScript.

**Tech Stack:** React 18, Vite, TypeScript, TanStack Query, Testing Library/Vitest, Playwright or equivalent browser E2E tooling, axe-core, Lighthouse/Web Vitals, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-20-cresciva-production-readiness-design.md`

## Global Constraints

- Preserve current `MotionConfig reducedMotion="user"` behavior.
- Preserve route-level lazy loading and do not merge secondary routes back into the entry bundle.
- Critical journeys must work at 360 px viewport width and with keyboard-only navigation.
- Accessibility target is WCAG 2.1 AA for launch-critical pages.
- Do not block launch on converting the entire repository to `strict: true`; use a ratchet with no new implicit `any` in changed production code.
- Static crawler metadata must use the official Phase 3 production origin.
- Performance work must be driven by measured bundle/runtime impact rather than deleting useful features indiscriminately.

---

### Task 1: Create browser-level critical-route tests

**Files:**
- Add browser test tool/config at repository root or `Frontend/e2e/`
- Create: `Frontend/e2e/public-routes.spec.ts`
- Create: `Frontend/e2e/auth-dashboard.spec.ts`
- Create: `Frontend/e2e/payment-callback.spec.ts`
- Create: `AdminPanel/e2e/admin-routes.spec.ts` or equivalent shared browser suite

**Interfaces:**
- Browser tests run against a built/preview deployment or local production preview, not component mocks only.

- [ ] **Step 1: Add smoke tests for direct navigation and refresh**

Cover:

```text
/
/auth
/auth/signup
/auth/forgot
/directory
/directory/:known-test-slug
/resources
/blog
/about
/contact
/privacy
/terms
/faq
/payment/callback without ref
/admin/
```

Every route must survive direct address-bar navigation/refresh under SPA rewrites.

- [ ] **Step 2: Add authenticated dashboard route tests**

Use a dedicated test account/environment. Cover dashboard home, funding, profile edit and account/billing routes.

- [ ] **Step 3: Add history/navigation tests for retired routes**

`/funding` and `/directory/create` must redirect to the intended dashboard routes without loops or losing auth-next behavior.

### Task 2: Add automated accessibility gate

**Files:**
- Add axe/browser test dependency/config
- Create: `Frontend/e2e/accessibility.spec.ts`
- Create: `AdminPanel/e2e/accessibility.spec.ts`

- [ ] **Step 1: Run axe on launch-critical pages**

At minimum landing, auth, directory, profile detail, dashboard home, funding, billing/payment callback and core admin dashboard.

- [ ] **Step 2: Test keyboard navigation**

Verify skip/focus behavior, menus/dialogs, directory filters, funding expand/collapse, billing actions and admin navigation.

- [ ] **Step 3: Verify status/error announcements**

Critical loading, payment and form-error states must expose `role=status`/`aria-live` or equivalent semantics where appropriate.

- [ ] **Step 4: Fix all critical/serious automated findings and manually review meaningful false positives**

The evidence document must record accepted exceptions with rationale; color contrast, missing names/labels and focus traps are not launch waivers.

### Task 3: Establish performance budgets

**Files:**
- Create/update Vite bundle reporting config or CI script
- Create: `scripts/check-web-budgets.mjs`
- Create/update: `docs/production-readiness/evidence/web-quality-report.md`

**Interfaces:**
- `npm run verify:web-quality` checks bundle budgets and browser tests after the production build.

- [ ] **Step 1: Capture current production baseline**

Record compressed JS/CSS sizes for entry chunks and largest lazy chunks plus Lighthouse/Web Vitals on representative mobile throttling.

- [ ] **Step 2: Set initial budgets from baseline with deliberate ceilings**

Budgets should prevent regressions rather than invent arbitrary perfect numbers. The entry bundle gets the strictest ceiling because it affects every visitor.

- [ ] **Step 3: Inspect heavy modules**

Prioritize duplicate library copies, admin code leaking into public bundle, image size, fonts, charts/editors and funding/profile tooling that should remain lazy.

- [ ] **Step 4: Verify real mobile behavior**

Test slow/unstable network states: skeletons remain usable, retries are available, and a transient request failure never becomes a false empty/paywall state.

### Task 4: Ratchet TypeScript safety

**Files:**
- Modify: `Frontend/tsconfig.app.json`
- Modify: `Backend/tsconfig.json`
- Modify: AdminPanel/Shared tsconfigs as applicable
- Create focused stricter tsconfigs if necessary, e.g. `Frontend/tsconfig.strict.json`, `Backend/tsconfig.strict.json`

**Interfaces:**
- Root `typecheck` from Phase 2 remains green.

- [ ] **Step 1: Measure current strictness failures**

Run strict checks without changing code first:

```bash
npx tsc -p Frontend/tsconfig.app.json --noEmit --strict --noImplicitAny
npx tsc -p Backend/tsconfig.json --noEmit --strict --noImplicitAny
```

Capture counts/categories, not giant logs in git.

- [ ] **Step 2: Ban new `any` in changed application code**

Use ESLint/type rules or a strict project covering newly hardened modules. Explicit, narrow interop escape hatches must be named and typed with `unknown`/small interfaces like the recent dashboard refactor.

- [ ] **Step 3: Turn on strict options incrementally**

Prioritize payment, auth, funding contracts and Backend boundary modules before marketing components. Each ratchet must reduce or preserve the exception count; never increase it to make a build pass.

### Task 5: Certify SEO and social sharing

**Files:**
- Existing: `Frontend/index.html`
- Existing: `Shared/src/lib/siteMeta.ts`
- Existing: `scripts/generate-sitemap.mjs`
- Existing: OG screenshot generator
- Modify: dynamic profile/content metadata strategy as needed
- Add metadata tests

- [ ] **Step 1: Verify static production HTML**

Inspect built HTML without executing JS and confirm title, description, canonical, OG/Twitter URLs/image and Cresciva identity.

- [ ] **Step 2: Verify sitemap/robots canonical host**

No localhost, preview URL or obsolete ScaleUp Africa hostname may appear in production output.

- [ ] **Step 3: Solve dynamic crawler metadata deliberately**

Client-side `<SEO>` is insufficient for bots that do not execute JavaScript. For high-value public profile/blog/resource routes, select and implement one supported approach: server-rendered OG endpoint/redirect architecture already represented by Backend, Vercel prerendering, or generated static metadata pages. The chosen approach must be tested using a no-JS HTTP fetch/user-agent.

- [ ] **Step 4: Verify OG image dimensions/content**

Regenerate the 1200×630 hero screenshot after final landing changes and test the absolute image URL returns 200.

### Task 6: Cross-browser and mobile acceptance

**Files:**
- Update: browser test matrix
- Update: `docs/production-readiness/evidence/web-quality-report.md`

- [ ] **Step 1: Test current iOS Safari/WebKit, Android Chromium and desktop Chromium/Firefox/WebKit equivalents**

Focus on auth redirects, file/image upload/crop, Paystack redirect-return, fixed/sticky navigation, dialogs, form keyboard behavior and infinite directory loading.

- [ ] **Step 2: Test reduced motion and 200% zoom**

No content becomes inaccessible or clipped.

- [ ] **Step 3: Test disabled/slow JavaScript failure behavior where relevant**

Marketing content and crawler metadata should remain understandable; authenticated SPA features may require JS but must fail clearly rather than display misleading states.

### Task 7: Add web quality to CI without making it flaky

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: root `package.json`

- [ ] **Step 1: Put deterministic component/accessibility/bundle checks in normal CI**

- [ ] **Step 2: Put full browser E2E in a dedicated job with controlled test environment**

Retry only infrastructure/browser-start failures; do not blanket-retry assertion failures until they pass.

- [ ] **Step 3: Require the stable launch-critical browser job before production promotion once it demonstrates reliability**

## Phase 7 Definition of Done

- Critical routes/deep links pass browser tests.
- WCAG critical/serious launch issues are cleared.
- Keyboard/focus/live-region behavior is verified.
- Mobile performance baseline and regression budgets exist.
- TypeScript safety has a measurable ratchet with no new broad `any` escape hatches in hardened paths.
- Static/dynamic crawler metadata uses the official production origin.
- OG/sitemap/robots output is verified without JavaScript.
- Cross-browser payment/auth/profile journeys pass.
- Evidence ends with `PHASE 7 RELEASE GATE: PASS`.