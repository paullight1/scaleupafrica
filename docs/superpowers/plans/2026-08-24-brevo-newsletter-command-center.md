# Brevo Newsletter Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/admin/newsletter` into a rich campaign, audience, subscriber, and reporting workspace backed by Brevo while preserving Supabase as the consent source of truth.

**Architecture:** Supabase tables hold local campaigns, audience snapshots, consent history, normalized delivery events, and provider-sync work. A JWT-protected `newsletter-admin` Edge Function owns privileged admin/provider actions, while a bearer-protected `brevo-webhook` ingests marketing events. AdminPanel uses focused query hooks and pure newsletter domain/rendering helpers to provide the workspace and structured campaign studio.

**Tech Stack:** React 18, TypeScript, Vite, TanStack Query, Vitest/Testing Library, Supabase Postgres/RLS, Supabase Edge Functions (Deno-compatible TypeScript), Brevo Marketing API v3.

**Spec:** `docs/superpowers/specs/2026-08-24-brevo-newsletter-command-center-design.md`

## Global Constraints

- Brevo handles marketing campaigns; the existing Resend transactional transport remains unchanged.
- Supabase remains authoritative for consent, campaign drafts, snapshots, and normalized events.
- Brevo secrets stay in Edge Function environment variables and never enter Vite/browser code.
- Only administrators may read newsletter operations data or invoke mutations.
- Campaign content is validated structured block JSON; arbitrary HTML is not accepted.
- Every campaign must have a successful test for its current content revision before send or schedule.
- Sent campaigns are immutable and can only be duplicated.
- Provider webhook delivery is at-least-once, so processing must be idempotent.
- Do not hand-edit `Shared/src/integrations/supabase/types.ts`.
- Preserve unrelated dirty-worktree changes and stage only task-specific files.

---

### Task 1: Newsletter domain types, audience validation, and renderer

**Files:**
- Create: `AdminPanel/src/lib/newsletter/types.ts`
- Create: `AdminPanel/src/lib/newsletter/audience.ts`
- Create: `AdminPanel/src/lib/newsletter/render.ts`
- Test: `AdminPanel/src/lib/newsletter/audience.test.ts`
- Test: `AdminPanel/src/lib/newsletter/render.test.ts`

**Interfaces:**
- Produces: `CampaignBlock`, `CampaignDraft`, `AudienceFilter`, `validateAudienceFilter()`, `renderNewsletter()` and `plainTextNewsletter()`.
- Consumes: no application state or browser APIs; helpers remain pure and importable by tests and UI.

- [ ] **Step 1: Write failing audience and renderer tests**

```ts
it("combines source and inclusive date filters", () => {
  const filter = validateAudienceFilter({ mode: "segment", sources: ["landing"], joinedAfter: "2026-08-01", joinedBefore: "2026-08-24" });
  expect(filter).toEqual({ mode: "segment", sources: ["landing"], joinedAfter: "2026-08-01", joinedBefore: "2026-08-24" });
});

it("escapes authored content and rejects unsafe links", () => {
  const result = renderNewsletter({ subject: "News", previewText: "", blocks: [
    { id: "1", type: "paragraph", text: "<script>alert(1)</script>" },
    { id: "2", type: "button", label: "Apply", url: "javascript:alert(1)" },
  ]});
  expect(result.html).not.toContain("<script>");
  expect(result.html).not.toContain("javascript:");
  expect(result.text).toContain("<script>alert(1)</script>");
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test --workspace AdminPanel -- src/lib/newsletter/audience.test.ts src/lib/newsletter/render.test.ts`

Expected: FAIL because the newsletter modules do not exist.

- [ ] **Step 3: Implement discriminated block types, strict audience parsing, HTML escaping, safe URL handling, branded HTML, and text rendering**

```ts
export type CampaignBlock =
  | { id: string; type: "heading"; text: string; level: 1 | 2 }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "image"; url: string; alt: string; href?: string }
  | { id: string; type: "button"; label: string; url: string }
  | { id: string; type: "divider" }
  | { id: string; type: "funding" | "resource"; title: string; summary: string; url: string }
  | { id: string; type: "social"; links: Array<{ label: string; url: string }> };

export type AudienceFilter =
  | { mode: "all"; sources: []; joinedAfter: null; joinedBefore: null }
  | { mode: "segment"; sources: string[]; joinedAfter: string | null; joinedBefore: string | null };
```

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run: `npm test --workspace AdminPanel -- src/lib/newsletter/audience.test.ts src/lib/newsletter/render.test.ts`

Expected: PASS with escaping, URL, plain-text, and filter cases covered.

- [ ] **Step 5: Commit the domain unit**

```bash
git add AdminPanel/src/lib/newsletter
git commit -m "feat(admin): add newsletter campaign domain"
```

### Task 2: Newsletter database foundation and authorization tests

**Files:**
- Create through CLI: `supabase/migrations/*_newsletter_command_center.sql`
- Create: `supabase/tests/newsletter_command_center.sql`

**Interfaces:**
- Produces tables `newsletter_consent_events`, `newsletter_campaigns`, `newsletter_campaign_recipients`, `newsletter_campaign_events`, and `newsletter_sync_jobs` plus subscriber metadata columns and guarded helper functions.
- Consumes established `public.is_admin(auth.uid())` authorization helper.

- [ ] **Step 1: Create the migration using the repository's imperative workflow**

Run: `npx supabase migration new newsletter_command_center`

Expected: the CLI prints the exact generated migration path; use that file rather than inventing a timestamp.

- [ ] **Step 2: Write failing SQL authorization/state tests**

```sql
select has_table('public', 'newsletter_campaigns');
select has_column('public', 'newsletter_subscribers', 'brevo_sync_status');
select isnt_empty($$select 1 from pg_policies where tablename = 'newsletter_campaigns' and cmd = 'SELECT'$$);
select throws_ok(
  $$update public.newsletter_campaigns set subject = 'changed' where status = 'sent'$$,
  'P0001', 'Sent campaigns are immutable'
);
```

- [ ] **Step 3: Run SQL tests and verify RED when a local Supabase stack is available**

Run: `npx supabase test db --file supabase/tests/newsletter_command_center.sql`

Expected: FAIL because the tables/columns do not exist. If Docker/local Supabase is unavailable, record that environment limitation and continue with static SQL review plus project tests.

- [ ] **Step 4: Implement schema, checks, indexes, triggers, explicit grants, and RLS**

The migration must:

- backfill subscriber consent/sync metadata without changing existing statuses;
- use check constraints for every enum-like status;
- index subscriber `lower(email)`, `(status, created_at)`, campaign status/schedule, pending sync jobs, and event campaign/time;
- create append-only consent records;
- reject content/audience updates once status is not `draft`;
- grant admin reads through RLS and reserve provider/event/snapshot mutations for service role;
- revoke `EXECUTE` from `PUBLIC`, `anon`, and `authenticated` on every security-definer helper before narrowly granting any intended caller.

- [ ] **Step 5: Run SQL tests/advisors and verify GREEN**

Run: `npx supabase test db --file supabase/tests/newsletter_command_center.sql`

Run: `npx supabase db lint --local`

Expected: SQL tests PASS and no new security errors. If the local service is unavailable, `git diff --check` and migration parsing in the later full suite remain mandatory.

- [ ] **Step 6: Commit schema and tests**

```bash
git add supabase/migrations supabase/tests/newsletter_command_center.sql
git commit -m "feat(db): add newsletter campaign schema"
```

### Task 3: Pure Brevo client and webhook normalization

**Files:**
- Create: `supabase/functions/_shared/brevo/types.ts`
- Create: `supabase/functions/_shared/brevo/client.ts`
- Create: `supabase/functions/_shared/brevo/webhook.ts`
- Test: `Frontend/src/lib/__tests__/brevo-client.test.ts`
- Test: `Frontend/src/lib/__tests__/brevo-webhook.test.ts`

**Interfaces:**
- Produces: `createBrevoClient(config, options)`, `redactBrevoError()`, `normalizeBrevoWebhookEvent()`, and `brevoEventKey()`.
- The client exposes `health()`, `upsertContact()`, `suppressContact()`, `createCampaign()`, `sendTest()`, `scheduleCampaign()`, `sendCampaign()`, `cancelCampaign()`, and `getCampaign()`.

- [ ] **Step 1: Write failing fetch-injection and webhook-normalization tests**

```ts
it("keeps the API key out of provider errors", async () => {
  const fetchImpl = vi.fn(async () => new Response('{"message":"bad xkeysib-secret"}', { status: 401 }));
  const result = await createBrevoClient({ apiKey: "xkeysib-secret", listId: 12, senderId: 4 }, { fetchImpl }).health();
  expect(result).toMatchObject({ ok: false, retryable: false });
  expect(JSON.stringify(result)).not.toContain("xkeysib-secret");
});

it("maps marketing unsubscribe into a stable consent event", () => {
  expect(normalizeBrevoWebhookEvent({ id: 9, event: "unsubscribed", email: "A@Example.com", camp_id: 12, ts_event: 10 }))
    .toMatchObject({ eventType: "unsubscribed", email: "a@example.com", campaignProviderId: 12 });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test --workspace Frontend -- src/lib/__tests__/brevo-client.test.ts src/lib/__tests__/brevo-webhook.test.ts`

Expected: FAIL because the Brevo modules do not exist.

- [ ] **Step 3: Implement a fetch-only Brevo adapter with timeout, retry classification, bounded error bodies, and strict response parsing**

Use `https://api.brevo.com/v3`, the `api-key` header, and JSON content type. Treat network errors, `408`, `429`, and `5xx` as retryable. Never echo request headers or credentials. Accept batched webhook payloads as either an object or an array and discard unknown/unbounded fields.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test --workspace Frontend -- src/lib/__tests__/brevo-client.test.ts src/lib/__tests__/brevo-webhook.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit provider boundary**

```bash
git add supabase/functions/_shared/brevo Frontend/src/lib/__tests__/brevo-*.test.ts
git commit -m "feat(email): add Brevo marketing adapter"
```

### Task 4: Authenticated newsletter administration and secured webhook functions

**Files:**
- Create: `supabase/functions/newsletter-admin/index.ts`
- Create: `supabase/functions/brevo-webhook/index.ts`
- Modify: `supabase/config.toml`
- Modify: `supabase/.env.example`
- Test: `Frontend/src/lib/__tests__/newsletter-transitions.test.ts`
- Create: `supabase/functions/_shared/brevo/transitions.ts`

**Interfaces:**
- Produces the JSON action contract consumed by `AdminPanel/src/lib/newsletter/api.ts`.
- `newsletter-admin` requires a valid user JWT and an `is_admin` database check.
- `brevo-webhook` has `verify_jwt = false` but requires exact bearer-token comparison before parsing the body.

- [ ] **Step 1: Write failing transition/idempotency tests**

```ts
it("never resubscribes a locally suppressed subscriber during routine sync", () => {
  expect(contactSyncIntent({ status: "unsubscribed", brevo_sync_status: "suppressed" }))
    .toEqual({ emailBlacklisted: true, operation: "suppress" });
});

it("requires a successful test for the current revision", () => {
  expect(canDeliver({ revision: 4, last_test_revision: 3, last_test_status: "sent" })).toBe(false);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test --workspace Frontend -- src/lib/__tests__/newsletter-transitions.test.ts`

Expected: FAIL because transition helpers do not exist.

- [ ] **Step 3: Implement pure consent/campaign transition rules and verify GREEN**

Run: `npm test --workspace Frontend -- src/lib/__tests__/newsletter-transitions.test.ts`

Expected: PASS.

- [ ] **Step 4: Implement `newsletter-admin` actions with strict validation and server-owned Brevo configuration**

Use a top-level action union containing `overview`, `subscribers.list`, `subscriber.add`, `subscriber.status`, `subscriber.retry`, `campaigns.list`, `campaign.get`, `campaign.save`, `campaign.duplicate`, `audience.estimate`, `campaign.test`, `campaign.deliver`, `campaign.cancel`, `campaign.report`, `settings.health`, and `settings.resync`. Campaign delivery must perform the snapshot and compare-and-set transition before creating/sending a Brevo campaign.

- [ ] **Step 5: Implement the bearer-protected, idempotent Brevo webhook**

Compare `Authorization` against `Bearer ${BREVO_WEBHOOK_TOKEN}` before reading JSON. Insert normalized events with `onConflict`/unique identity semantics. Apply unsubscribe/hard-bounce/spam suppression and consent-event append in one server-side operation.

- [ ] **Step 6: Configure functions and document server secrets**

```toml
[functions.newsletter-admin]
verify_jwt = true

[functions.brevo-webhook]
verify_jwt = false
```

Add `BREVO_API_KEY`, `BREVO_LIST_ID`, `BREVO_SENDER_ID`, and `BREVO_WEBHOOK_TOKEN` with descriptive blank values to `supabase/.env.example`.

- [ ] **Step 7: Run function-adjacent tests and static checks**

Run: `npm test --workspace Frontend -- src/lib/__tests__/brevo-client.test.ts src/lib/__tests__/brevo-webhook.test.ts src/lib/__tests__/newsletter-transitions.test.ts`

Run: `npx tsc --noEmit --allowImportingTsExtensions --moduleResolution bundler --module esnext --target es2022 supabase/functions/_shared/brevo/types.ts supabase/functions/_shared/brevo/client.ts supabase/functions/_shared/brevo/webhook.ts supabase/functions/_shared/brevo/transitions.ts`

Expected: PASS.

- [ ] **Step 8: Commit Edge Functions and configuration**

```bash
git add supabase/functions/newsletter-admin supabase/functions/brevo-webhook supabase/functions/_shared/brevo/transitions.ts supabase/config.toml supabase/.env.example Frontend/src/lib/__tests__/newsletter-transitions.test.ts
git commit -m "feat(email): add newsletter admin and Brevo webhooks"
```

### Task 5: Admin newsletter API/query layer

**Files:**
- Create: `AdminPanel/src/lib/newsletter/api.ts`
- Create: `AdminPanel/src/hooks/queries/adminNewsletter.ts`
- Test: `AdminPanel/src/lib/newsletter/api.test.ts`

**Interfaces:**
- Produces `newsletterAdmin<T>(action, payload)`, newsletter query keys, typed list/detail hooks, autosave mutation, subscriber status mutation, test mutation, deliver mutation, cancel mutation, and resync mutation.
- Consumes the `newsletter-admin` action response contract from Task 4.

- [ ] **Step 1: Write a failing API error-normalization test**

```ts
it("surfaces the server message without exposing response internals", async () => {
  invoke.mockResolvedValue({ data: { error: "Brevo sender is not configured" }, error: null });
  await expect(newsletterAdmin("settings.health", {})).rejects.toThrow("Brevo sender is not configured");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test --workspace AdminPanel -- src/lib/newsletter/api.test.ts`

Expected: FAIL because the API wrapper does not exist.

- [ ] **Step 3: Implement the action wrapper and focused TanStack Query hooks**

Use stable primitive query-key fields rather than entire mutable objects. Debounced search stays in the page component. Mutations invalidate only the overview/subscriber/campaign keys they affect and display specific success/failure toasts.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test --workspace AdminPanel -- src/lib/newsletter/api.test.ts`

Run: `npm run typecheck --workspace AdminPanel`

Expected: PASS.

- [ ] **Step 5: Commit the client boundary**

```bash
git add AdminPanel/src/lib/newsletter/api.ts AdminPanel/src/lib/newsletter/api.test.ts AdminPanel/src/hooks/queries/adminNewsletter.ts
git commit -m "feat(admin): add newsletter operations client"
```

### Task 6: Newsletter workspace overview, subscribers, settings, and campaign list

**Files:**
- Create: `AdminPanel/src/components/newsletter/NewsletterOverview.tsx`
- Create: `AdminPanel/src/components/newsletter/SubscriberManager.tsx`
- Create: `AdminPanel/src/components/newsletter/CampaignList.tsx`
- Create: `AdminPanel/src/components/newsletter/NewsletterSettings.tsx`
- Create: `AdminPanel/src/components/newsletter/NewsletterTabs.tsx`
- Rewrite: `AdminPanel/src/pages/AdminNewsletter.tsx`
- Test: `AdminPanel/src/pages/AdminNewsletter.test.tsx`

**Interfaces:**
- Produces the four-tab `/admin/newsletter` workspace and routes campaign selection into the studio state.
- Consumes query/mutation hooks from Task 5 and shared UI primitives without modifying shared stock components.

- [ ] **Step 1: Write failing workspace tests**

```tsx
it("moves between campaign, subscriber, and settings workspaces", async () => {
  renderNewsletterPage();
  expect(await screen.findByRole("heading", { name: "Newsletter command center" })).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "Subscribers" }));
  expect(screen.getByRole("heading", { name: "Audience" })).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "Settings" }));
  expect(screen.getByText("Brevo connection")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test --workspace AdminPanel -- src/pages/AdminNewsletter.test.tsx`

Expected: FAIL against the old one-table page.

- [ ] **Step 3: Build the responsive workspace**

Keep navigation in local URL search state (`?view=overview|campaigns|subscribers|settings`) so refresh/back navigation works without changing dirty shared routing files. Include honest loading/error/empty states, server pagination, filtered CSV export, manual consent confirmation, sync badges, and guarded resync confirmation.

- [ ] **Step 4: Run tests, accessibility assertions, and typecheck**

Run: `npm test --workspace AdminPanel -- src/pages/AdminNewsletter.test.tsx`

Run: `npm run typecheck --workspace AdminPanel`

Expected: PASS.

- [ ] **Step 5: Commit workspace surfaces**

```bash
git add AdminPanel/src/components/newsletter AdminPanel/src/pages/AdminNewsletter.tsx AdminPanel/src/pages/AdminNewsletter.test.tsx
git commit -m "feat(admin): build newsletter operations workspace"
```

### Task 7: Rich campaign studio, previews, audience choice, and delivery safety

**Files:**
- Create: `AdminPanel/src/components/newsletter/CampaignStudio.tsx`
- Create: `AdminPanel/src/components/newsletter/CampaignComposer.tsx`
- Create: `AdminPanel/src/components/newsletter/BlockEditor.tsx`
- Create: `AdminPanel/src/components/newsletter/CampaignPreview.tsx`
- Create: `AdminPanel/src/components/newsletter/AudienceBuilder.tsx`
- Create: `AdminPanel/src/components/newsletter/DeliveryReview.tsx`
- Test: `AdminPanel/src/components/newsletter/CampaignStudio.test.tsx`

**Interfaces:**
- Produces draft autosave, structured block editing, audience estimation, preview/test, and deliver/schedule workflow.
- Consumes Task 1 renderer/types and Task 5 API hooks.

- [ ] **Step 1: Write failing editor and safety tests**

```tsx
it("requires a successful test for the current revision before delivery", async () => {
  renderStudio({ revision: 3, lastTestRevision: null });
  await user.click(screen.getByRole("button", { name: "Review & deliver" }));
  expect(screen.getByRole("button", { name: "Send now" })).toBeDisabled();
  await user.type(screen.getByLabelText("Test recipient"), "admin@cresciva.test");
  await user.click(screen.getByRole("button", { name: "Send test" }));
  expect(await screen.findByText("Test delivered for revision 3")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send now" })).toBeEnabled();
});

it("switches from all active subscribers to a source/date segment", async () => {
  renderStudio();
  await user.click(screen.getByLabelText("Selected segment"));
  await user.click(screen.getByLabelText("landing-cta"));
  await user.type(screen.getByLabelText("Joined after"), "2026-08-01");
  expect(await screen.findByText(/estimated recipients/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run studio tests and verify RED**

Run: `npm test --workspace AdminPanel -- src/components/newsletter/CampaignStudio.test.tsx`

Expected: FAIL because the studio does not exist.

- [ ] **Step 3: Implement compose and block operations**

Support add, edit, move up/down, duplicate, and remove for every approved block type. Autosave after a short idle delay, display saving/saved/error state, and increment the server revision whenever content changes. Use direct component imports and no new editor dependency.

- [ ] **Step 4: Implement audience and review steps**

Use server estimates/samples, render desktop/mobile previews in a sandboxed iframe via `srcDoc`, require a successful current-revision test, and present a destructive-style final confirmation containing the exact snapshot count and schedule time.

- [ ] **Step 5: Run tests, typecheck, and build**

Run: `npm test --workspace AdminPanel -- src/components/newsletter/CampaignStudio.test.tsx src/pages/AdminNewsletter.test.tsx`

Run: `npm run typecheck --workspace AdminPanel`

Run: `npm run build --workspace AdminPanel`

Expected: PASS with no Vite chunk or TypeScript errors.

- [ ] **Step 6: Commit the campaign studio**

```bash
git add AdminPanel/src/components/newsletter
git commit -m "feat(admin): add rich newsletter campaign studio"
```

### Task 8: Documentation, full verification, and operational handoff

**Files:**
- Modify: `docs/EMAIL.md`
- Modify: `docs/ADMIN_PANEL.md`
- Modify: `README.md`

**Interfaces:**
- Documents exact Brevo setup, deployment, webhook events/authentication, sender-domain prerequisites, and the Resend/Brevo responsibility split.

- [ ] **Step 1: Update operations documentation**

Document secrets, Brevo list and sender IDs, domain authentication, deploying both functions, creating a batched marketing webhook with bearer auth, reconciliation behavior, and test-send/send safety.

- [ ] **Step 2: Run focused verification**

Run: `npm test --workspace AdminPanel`

Run: `npm test --workspace Frontend -- src/lib/__tests__/email-templates.test.ts src/lib/__tests__/brevo-client.test.ts src/lib/__tests__/brevo-webhook.test.ts src/lib/__tests__/newsletter-transitions.test.ts`

Run: `npm run lint --workspace AdminPanel`

Run: `npm run typecheck --workspace AdminPanel`

Run: `npm run build --workspace AdminPanel`

Expected: all commands PASS without warnings introduced by newsletter files.

- [ ] **Step 3: Run repository-level regression verification**

Run: `npm run typecheck`

Run: `npm test`

Expected: PASS, or report pre-existing failures with commands and evidence while keeping newsletter-targeted checks green.

- [ ] **Step 4: Review diffs and secret hygiene**

Run: `git diff --check`

Run: `rg -n "xkeysib-|BREVO_API_KEY=" AdminPanel Frontend Shared supabase docs README.md -g '!*.example'`

Expected: no whitespace errors and no committed Brevo credentials.

- [ ] **Step 5: Commit documentation**

```bash
git add docs/EMAIL.md docs/ADMIN_PANEL.md README.md
git commit -m "docs: add Brevo newsletter operations guide"
```
