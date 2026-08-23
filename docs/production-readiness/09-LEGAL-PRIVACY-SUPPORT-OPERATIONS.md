# Legal, Privacy, Support & Operational Trust Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure Cresciva's legal pages, consent model, public company/support identity, data-rights workflows and payment/customer-support operations accurately match the product that will launch.

**Architecture:** Keep legal/content pages inside the existing public site and operational workflows in the existing admin/support surfaces. Align policy language with actual data flows verified in Phases 1–8, expose a real support route/contact identity, implement or certify account data export/deletion, and define payment/funding support runbooks that staff can execute without direct unsafe database edits.

**Tech Stack:** React content/legal pages, Supabase Auth/Postgres/Storage, AdminPanel, transactional email, Paystack operational dashboard/reconciliation, documentation/runbooks.

**Spec:** `docs/superpowers/specs/2026-08-20-cresciva-production-readiness-design.md`

## Global Constraints

- Legal text must describe actual behavior, not planned future behavior.
- Do not claim Cresciva guarantees funding, verifies businesses beyond implemented verification, or guarantees grant success.
- Public contact/support channels must be real and monitored before launch.
- Users must know which profile/contact fields are public and control supported visibility settings.
- Payment/support staff must never grant access by casually editing subscription rows; use verified reconciliation/grant procedures.
- Legal review by qualified counsel remains advisable for jurisdiction-specific obligations; engineering must still make product behavior and documentation internally consistent.

---

### Task 1: Replace remaining ownership placeholders

**Files:**
- Modify: `README.md`
- Modify: `Frontend/src/pages/Contact.tsx`
- Modify: global footer/contact components under `Frontend/src/components/`
- Modify email configuration/docs as needed: `docs/EMAIL.md`
- Create/update: `docs/production-readiness/evidence/legal-support-readiness.md`

- [ ] **Step 1: Set the real public support identity**

The website, transactional email, Privacy Policy and Terms must point to the same monitored support/contact route or address.

- [ ] **Step 2: Resolve README license ownership line**

Choose and record the actual repository licensing position appropriate to this private/commercial codebase. Remove `TODO(owner): license` rather than inventing an open-source license accidentally.

- [ ] **Step 3: Remove obsolete ScaleUp Africa operational identity**

Search public copy/email templates/legal metadata for old-brand organization names and replace only where Cresciva is the actual contracting/operator identity. Preserve historical references only when legally necessary.

### Task 2: Map product data flows to Privacy Policy

**Files:**
- Modify: `Frontend/src/pages/Privacy.tsx`
- Update: `docs/production-readiness/evidence/legal-support-readiness.md`

- [ ] **Step 1: Build a data inventory from Phase 4**

Policy must cover, where actually collected:

```text
account identifiers
authentication/session data
business profile data
public contact visibility choices
uploaded images
payment transaction/audit metadata
funding searches, saves and preferences
contact-form leads
newsletter subscriptions
resource-download leads
email delivery/unsubscribe events
admin/security audit data
analytics/error telemetry
hashed abuse-prevention IP identifiers
```

- [ ] **Step 2: State purpose, visibility and retention clearly**

Especially distinguish public directory fields from private account/payment/support data.

- [ ] **Step 3: Document processors/categories actually used**

Supabase, Vercel, Paystack, email provider, AI provider/gateway and monitoring/analytics providers enabled at launch must be represented accurately.

- [ ] **Step 4: State data-rights request channel**

The channel must be monitored and tested end-to-end.

### Task 3: Align Terms, Disclaimer and Funding trust language

**Files:**
- Modify: `Frontend/src/pages/Terms.tsx`
- Modify: `Frontend/src/pages/Disclaimer.tsx`
- Modify: Funding Radar explanatory copy where necessary

- [ ] **Step 1: Preserve anti-fraud and no-guarantee positioning**

Terms/disclaimer must make clear Cresciva is an information/networking platform, not a funder and not a guarantee of eligibility or award.

- [ ] **Step 2: Align “verified” terminology with Phase 5**

If an opportunity is described as verified, the legal/trust copy should explain that Cresciva checked the listed source as of a specific time and users must still confirm current funder requirements.

- [ ] **Step 3: Align payment/membership terms with actual billing model**

State annual term, activation, renewal behavior actually implemented, cancellation/refund process actually offered, supported currencies and support route. Do not claim automatic recurring billing if the Paystack implementation is a one-time annual purchase.

### Task 4: Add explicit consent at account/marketing collection points

**Files:**
- Modify: `Frontend/src/pages/AuthSignUp.tsx`
- Modify contact/newsletter/resource lead components
- Modify profile-edit privacy controls as needed
- Add tests

- [ ] **Step 1: Account creation consent**

Signup presents linked Terms and Privacy and records/communicates acceptance according to the selected legal model. Do not pre-check optional marketing consent.

- [ ] **Step 2: Newsletter marketing consent**

Keep unsubscribe behavior already implemented. Newsletter signup must not be silently bundled into unrelated account/profile/payment actions.

- [ ] **Step 3: Profile publication clarity**

Before publishing/editing, the UI clearly identifies public fields and contact reveal choices. Default visibility settings must match the Privacy Policy and product intent.

### Task 5: Implement/certify account data export and deletion

**Files:**
- Modify: account settings under `Frontend/src/pages/dashboard/` or the current account component
- Create: service/Edge Function/RPC needed for secure export/deletion
- Create migration only if schema support is required
- Add tests

**Interfaces:**
- `export my data` returns the authenticated user's relevant portable data without other users' data.
- `delete my account` follows the retention rules defined in Phase 4.

- [ ] **Step 1: Add authenticated export path**

Include profile, preferences/saves and account-related records intended for portability. Payment/legal audit records can be represented without leaking provider secrets/raw payloads.

- [ ] **Step 2: Add deletion confirmation with recent-auth requirement where appropriate**

High-impact destructive action should require a deliberate confirmation and, if supported by the auth architecture, recent reauthentication.

- [ ] **Step 3: Execute deletion server-side**

Do not trust the browser to individually delete every row. A privileged server path must perform the authorized cascade/anonymization policy and remove user-owned storage where required.

- [ ] **Step 4: Test retained records**

Verify deleted account cannot log in, public profile/media is gone, and legally retained payment/audit data contains only the minimum retained identity required by the policy.

### Task 6: Define payment support and reconciliation operations

**Files:**
- Create: `docs/operations/PAYMENT_SUPPORT.md`
- Link: Phase 1 reconciliation admin surface

- [ ] **Step 1: Document common cases**

```text
charged but access pending
payment pending/abandoned
amount/currency mismatch alert
receipt not received
duplicate customer attempt
refund/cancellation request
concierge/manual transfer inquiry
```

- [ ] **Step 2: Define safe remediation**

Staff first verifies Paystack/reference and reconciliation data. No runbook step says “set has_access=true in Supabase”.

- [ ] **Step 3: Define escalation**

Payment integrity/data discrepancies escalate as P0/P1 according to Phase 8 alert policy.

### Task 7: Define funding-content support and correction workflow

**Files:**
- Create: `docs/operations/FUNDING_CORRECTIONS.md`
- Modify public opportunity UI to expose a correction/report link if not already available

- [ ] **Step 1: Let users report stale/wrong opportunities**

Capture opportunity ID, reason category and optional explanation; do not require users to email screenshots manually.

- [ ] **Step 2: Route reports into admin verification queue**

A credible deadline/source report can temporarily mark an opportunity for recheck instead of leaving a disputed “verified” badge untouched.

### Task 8: Publish support expectations

**Files:**
- Modify: `Frontend/src/pages/Contact.tsx`
- Create: `docs/operations/SUPPORT.md`

- [ ] **Step 1: Define support hours/channel and realistic response expectations**

Do not publish a response-time promise the team cannot staff.

- [ ] **Step 2: Define internal severity routing**

Payments/access/security outrank general directory/content questions.

- [ ] **Step 3: Send a real support request through production**

Confirm lead persistence, team notification, reply routing and user acknowledgement.

## Phase 9 Definition of Done

- README has no unresolved public license/support placeholder.
- Public company/support identity is consistent across site/email/legal content.
- Privacy Policy matches actual launch data flows/processors/retention.
- Terms/Disclaimer match the actual membership/payment/funding-verification behavior.
- Account/marketing/public-profile consent is clear.
- Account export and deletion are securely testable.
- Payment support never relies on unsafe manual entitlement edits.
- Funding correction workflow exists.
- Support contact path is monitored and tested.
- Evidence ends with `PHASE 9 RELEASE GATE: PASS`.