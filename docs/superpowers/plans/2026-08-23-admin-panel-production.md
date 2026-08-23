# Cresciva Admin Panel Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure and refine Cresciva’s existing AdminPanel so editors can prepare drafts, administrators control publication and deletion, and administrators see trustworthy audience, content, revenue, and operations metrics.

**Architecture:** Keep the existing React, TanStack Query, and Supabase application. Enforce role boundaries in Postgres RLS first, mirror them in typed React controls, extend the existing administrator RPC layer for aggregated reporting, and refine the current dashboard and content workflows without introducing another CMS.

**Tech Stack:** React 18, TypeScript, React Router 6, TanStack Query, React Hook Form, Zod, Recharts, Supabase/Postgres RLS and RPCs, Vitest, Testing Library, pgTAP.

**Spec:** `docs/superpowers/specs/2026-08-23-admin-panel-production-design.md`

## Global Constraints

- Editors may create and update draft Blog posts and Resources only.
- Only administrators may publish, unpublish, archive, restore, duplicate, or delete content.
- Supabase RLS is the authorization boundary; hidden UI controls are not sufficient.
- Revenue includes verified successful payment rows only and remains separated by currency.
- Administrator analytics use bounded aggregate RPCs, never whole-table browser downloads.
- Existing public reads for published Blog posts and Resources remain unchanged.
- Existing Funding, Users, Profiles, Leads, Newsletter, Payments, Settings, and Audit functionality remains available.
- Do not add Google Analytics, Search Console, scheduled publishing, comments, or multi-stage approvals in this phase.

---

### Task 1: Database-enforced content roles

**Files:**
- Create: `supabase/migrations/20260823193000_admin_content_role_boundaries.sql`
- Create: `supabase/tests/admin_content_role_boundaries.sql`

**Interfaces:**
- Produces RLS policies `blog_posts_admin_all`, `blog_posts_editor_drafts`, `resources_admin_all`, and `resources_editor_drafts`.
- Preserves public `SELECT` access to rows whose `status = 'published'`.
- Editors satisfy `is_staff(auth.uid()) AND NOT is_admin(auth.uid())` and can insert/update only draft rows.

- [ ] **Step 1: Write failing pgTAP authorization tests**

Create tests that provision representative admin/editor/member identities using the project’s existing auth-test helpers, then assert:

```sql
select lives_ok($$ insert into public.blog_posts (title, slug, content, status) values ('Draft', 'editor-draft', 'Body', 'draft') $$, 'editor creates blog draft');
select throws_ok($$ update public.blog_posts set status = 'published' where slug = 'editor-draft' $$, '42501', null, 'editor cannot publish blog post');
select throws_ok($$ delete from public.blog_posts where slug = 'editor-draft' $$, '42501', null, 'editor cannot delete blog post');
select lives_ok($$ update public.blog_posts set status = 'published' where slug = 'editor-draft' $$, 'admin publishes blog post');
```

Repeat the same matrix for `resources`, including the requirement that an editor cannot edit an already-published row or move a draft to `archived`.

- [ ] **Step 2: Run the focused database test and verify it fails**

Run: `npx supabase test db supabase/tests/admin_content_role_boundaries.sql --local`

Expected: editor publish/delete assertions fail because the legacy broad staff-write policies still allow them.

- [ ] **Step 3: Implement replacement policies in one migration**

Drop the legacy staff `ALL` policies only after creating distinct admin/editor policies. Use this policy shape for each content table:

```sql
create policy "<table> admin all" on public.<table>
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "<table> editor insert drafts" on public.<table>
  for insert to authenticated
  with check (public.is_staff(auth.uid()) and not public.is_admin(auth.uid()) and status = 'draft');

create policy "<table> editor update drafts" on public.<table>
  for update to authenticated
  using (public.is_staff(auth.uid()) and not public.is_admin(auth.uid()) and status = 'draft')
  with check (public.is_staff(auth.uid()) and not public.is_admin(auth.uid()) and status = 'draft');
```

Do not create editor delete policies. Preserve the existing published-row public select policies.

- [ ] **Step 4: Run the focused pgTAP test**

Run: `npx supabase test db supabase/tests/admin_content_role_boundaries.sql --local`

Expected: all Blog and Resource role assertions pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260823193000_admin_content_role_boundaries.sql supabase/tests/admin_content_role_boundaries.sql
git commit -m "security: enforce admin-only content publishing"
```

### Task 2: Central content permission contract

**Files:**
- Create: `AdminPanel/src/lib/contentPermissions.ts`
- Create: `AdminPanel/src/lib/contentPermissions.test.ts`
- Modify: `AdminPanel/src/App.tsx`
- Modify: `AdminPanel/src/components/AdminLayout.tsx`

**Interfaces:**
- Produces `contentPermissions(input: { isAdmin: boolean; isEditor: boolean; status: ContentStatus }): ContentPermissions`.
- `ContentPermissions` contains `canEdit`, `canSaveDraft`, `canPublish`, `canUnpublish`, `canArchive`, `canRestore`, `canDuplicate`, and `canDelete` booleans.

- [ ] **Step 1: Write the failing unit tests**

```ts
expect(contentPermissions({ isAdmin: false, isEditor: true, status: "draft" })).toMatchObject({
  canEdit: true, canSaveDraft: true, canPublish: false, canDelete: false,
});
expect(contentPermissions({ isAdmin: false, isEditor: true, status: "published" }).canEdit).toBe(false);
expect(contentPermissions({ isAdmin: true, isEditor: false, status: "published" })).toMatchObject({
  canEdit: true, canUnpublish: true, canArchive: true, canDelete: true,
});
```

- [ ] **Step 2: Run and verify the helper test fails**

Run: `npm test --workspace @cresciva/admin-panel -- --run src/lib/contentPermissions.test.ts`

Expected: module-not-found failure.

- [ ] **Step 3: Implement the pure permission helper**

Define `ContentStatus = "draft" | "published" | "archived"`. Administrators receive every action appropriate to the current status; editors receive only edit/save on drafts. All other identities receive no permissions.

- [ ] **Step 4: Make administrator-only routes explicit**

Keep Blog and Resources under the staff shell. Wrap the dashboard and every non-CMS operational route in `<AdminGuard require="admin">`. In `AdminLayout`, editor navigation contains Blog and Resources only; administrators see all existing groups. Do not rely on CSS hiding.

- [ ] **Step 5: Run unit tests, typecheck, and lint**

Run:

```bash
npm test --workspace @cresciva/admin-panel -- --run src/lib/contentPermissions.test.ts
npm run typecheck --workspace @cresciva/admin-panel
npm run lint --workspace @cresciva/admin-panel
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add AdminPanel/src/lib/contentPermissions.ts AdminPanel/src/lib/contentPermissions.test.ts AdminPanel/src/App.tsx AdminPanel/src/components/AdminLayout.tsx
git commit -m "feat: define admin and editor content permissions"
```

### Task 3: Role-aware Blog workflow

**Files:**
- Modify: `AdminPanel/src/pages/AdminBlog.tsx`
- Modify: `AdminPanel/src/pages/AdminBlogEdit.tsx`
- Modify: `AdminPanel/src/hooks/queries/adminBlog.ts`
- Create: `AdminPanel/src/pages/AdminBlog.permissions.test.tsx`

**Interfaces:**
- Consumes `contentPermissions` from Task 2.
- Produces editor-safe list/editor behavior and administrator-only mutations.

- [ ] **Step 1: Write failing UI tests**

Render list and editor pages under mocked `useRole` states. Assert an editor viewing a draft sees `Edit` and `Save draft`, but no Publish, Unpublish, Archive, Duplicate, or Delete controls. Assert an editor viewing published content sees a read-only notice. Assert an administrator sees the appropriate lifecycle actions.

- [ ] **Step 2: Run focused tests and verify the role assertions fail**

Run: `npm test --workspace @cresciva/admin-panel -- --run src/pages/AdminBlog.permissions.test.tsx`

Expected: privileged controls are currently visible to editors.

- [ ] **Step 3: Apply permission-aware rendering and mutation guards**

Use `useRole()` plus `contentPermissions`. Disable editor form fields for non-draft rows and show: `Published content is read-only for editors. Ask an administrator to return it to draft.` Ensure editor saves always send `status: "draft"`, regardless of stale form state.

At the beginning of publish, duplicate, and delete mutation functions, require `isAdmin` at the call site and let RLS remain the final guard. Keep existing audit actions for successful mutations.

- [ ] **Step 4: Run Blog tests and AdminPanel checks**

Run:

```bash
npm test --workspace @cresciva/admin-panel -- --run src/pages/AdminBlog.permissions.test.tsx
npm run typecheck --workspace @cresciva/admin-panel
```

Expected: editor/admin matrices pass and TypeScript exits 0.

- [ ] **Step 5: Commit**

```bash
git add AdminPanel/src/pages/AdminBlog.tsx AdminPanel/src/pages/AdminBlogEdit.tsx AdminPanel/src/hooks/queries/adminBlog.ts AdminPanel/src/pages/AdminBlog.permissions.test.tsx
git commit -m "feat: add administrator-controlled blog publishing"
```

### Task 4: Role-aware Resource workflow

**Files:**
- Modify: `AdminPanel/src/pages/AdminResources.tsx`
- Modify: `AdminPanel/src/pages/AdminResourceEdit.tsx`
- Modify: `AdminPanel/src/hooks/queries/adminResources.ts`
- Create: `AdminPanel/src/pages/AdminResources.permissions.test.tsx`

**Interfaces:**
- Consumes `contentPermissions` from Task 2.
- Matches the Blog lifecycle and copy conventions from Task 3.

- [ ] **Step 1: Write failing Resource role tests**

Assert editor draft edit/save access, published-row read-only behavior, absence of lifecycle/destructive actions, and full administrator controls. Include a test that an editor cannot submit `published` through the form payload.

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test --workspace @cresciva/admin-panel -- --run src/pages/AdminResources.permissions.test.tsx`

Expected: current staff UI exposes publish/duplicate/delete controls.

- [ ] **Step 3: Implement Resource permission rendering and guarded payloads**

Apply the shared helper to list actions and editor controls. Preserve file uploads and field values on errors. Editor submissions always persist `draft`; administrator submissions retain the selected lifecycle action.

- [ ] **Step 4: Run Resource tests and typecheck**

Run:

```bash
npm test --workspace @cresciva/admin-panel -- --run src/pages/AdminResources.permissions.test.tsx
npm run typecheck --workspace @cresciva/admin-panel
```

Expected: tests and TypeScript pass.

- [ ] **Step 5: Commit**

```bash
git add AdminPanel/src/pages/AdminResources.tsx AdminPanel/src/pages/AdminResourceEdit.tsx AdminPanel/src/hooks/queries/adminResources.ts AdminPanel/src/pages/AdminResources.permissions.test.tsx
git commit -m "feat: add administrator-controlled resource publishing"
```

### Task 5: Administrator analytics RPCs

**Files:**
- Create: `supabase/migrations/20260823194500_admin_reporting_rpc.sql`
- Create: `supabase/tests/admin_reporting_rpc.sql`
- Modify: `Shared/src/integrations/supabase/types.ts`

**Interfaces:**
- Produces `admin_reporting_summary(_days integer default 30) returns jsonb`.
- Produces `admin_content_performance(_days integer default 30, _limit integer default 10)` returning typed content rows.
- Summary JSON contains `audience`, `content`, `revenue`, and `operations` objects.

- [ ] **Step 1: Write failing pgTAP tests for authorization and aggregation**

Seed representative users, analytics events, successful/failed payments, subscriptions, Blog posts, Resources, and operational rows. Assert anonymous/member/editor calls are rejected, administrator calls succeed, failed payments are excluded, and USD/NGN totals are separate objects.

- [ ] **Step 2: Run and verify the reporting tests fail**

Run: `npx supabase test db supabase/tests/admin_reporting_rpc.sql --local`

Expected: functions do not exist.

- [ ] **Step 3: Implement bounded, self-guarded RPCs**

Clamp `_days` to `1..365` and `_limit` to `1..50`. Begin each function with:

```sql
if not public.is_admin(auth.uid()) then
  raise exception 'Administrator access required' using errcode = '42501';
end if;
```

Aggregate verified successful payment rows by `currency` and `plan_code`; never combine currencies. Use existing analytics event types for page/content events and return zero/empty values when no data exists. Revoke from `PUBLIC, anon`; grant execution to `authenticated, service_role`.

- [ ] **Step 4: Regenerate or update Supabase TypeScript types**

Ensure RPC names and result shapes are represented in `Shared/src/integrations/supabase/types.ts` without weakening existing table types.

- [ ] **Step 5: Run pgTAP and shared typecheck**

Run:

```bash
npx supabase test db supabase/tests/admin_reporting_rpc.sql --local
npm run typecheck --workspace @cresciva/shared
```

Expected: authorization and aggregate assertions pass; TypeScript exits 0.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260823194500_admin_reporting_rpc.sql supabase/tests/admin_reporting_rpc.sql Shared/src/integrations/supabase/types.ts
git commit -m "feat: add secure administrator reporting"
```

### Task 6: Reporting query layer and dashboard

**Files:**
- Modify: `AdminPanel/src/hooks/queries/adminDashboard.ts`
- Modify: `AdminPanel/src/pages/AdminDashboard.tsx`
- Create: `AdminPanel/src/pages/AdminDashboard.reporting.test.tsx`

**Interfaces:**
- Produces `useAdminReportingSummary(days: number)` and `useAdminContentPerformance(days: number, limit?: number)`.
- Dashboard supports periods `7`, `30`, and `90` days.

- [ ] **Step 1: Write failing dashboard reporting tests**

Mock the query hooks with audience, content, revenue-by-currency, and operations values. Assert all four lanes render, currency totals remain separate, period changes request the selected bounded range, and empty content rankings render a useful empty state.

- [ ] **Step 2: Run and verify the tests fail**

Run: `npm test --workspace @cresciva/admin-panel -- --run src/pages/AdminDashboard.reporting.test.tsx`

Expected: new hooks/sections are absent.

- [ ] **Step 3: Add typed query hooks**

Call the RPCs through TanStack Query using keys containing the selected period. Coerce numeric JSON values defensively and throw Supabase errors to the existing ErrorState boundary.

- [ ] **Step 4: Refactor the dashboard into four reporting lanes**

Retain current useful cards/charts. Add a 7/30/90-day selector, content performance table/cards, separate revenue cards per currency, plan mix, payment health, and operational attention links. Each chart must have a textual summary or table representation.

- [ ] **Step 5: Run focused tests, lint, and typecheck**

Run:

```bash
npm test --workspace @cresciva/admin-panel -- --run src/pages/AdminDashboard.reporting.test.tsx
npm run lint --workspace @cresciva/admin-panel
npm run typecheck --workspace @cresciva/admin-panel
```

Expected: all commands pass.

- [ ] **Step 6: Commit**

```bash
git add AdminPanel/src/hooks/queries/adminDashboard.ts AdminPanel/src/pages/AdminDashboard.tsx AdminPanel/src/pages/AdminDashboard.reporting.test.tsx
git commit -m "feat: expand administrator analytics dashboard"
```

### Task 7: Responsive production verification

**Files:**
- No production files are planned. If a verification command fails, stop this task, return to the task that owns the failing behavior, add a regression test there, and commit that scoped repair before restarting Task 7.

**Interfaces:**
- Verifies the complete AdminPanel and public content integration.

- [ ] **Step 1: Run the complete automated suites**

```bash
npm test --workspace @cresciva/admin-panel
npm run lint --workspace @cresciva/admin-panel
npm run typecheck --workspace @cresciva/admin-panel
npm run build --workspace @cresciva/admin-panel
npm test --workspace @cresciva/frontend
npm run typecheck --workspace @cresciva/frontend
```

Expected: every command exits 0.

- [ ] **Step 2: Run relevant database tests**

```bash
npx supabase test db supabase/tests/admin_content_role_boundaries.sql supabase/tests/admin_reporting_rpc.sql --local
```

Expected: all authorization and aggregation assertions pass.

- [ ] **Step 3: Browser smoke-test administrator and editor workflows**

At desktop and mobile widths verify: editor draft creation; editor inability to publish/delete; administrator publication; public visibility; Resource upload; dashboard period changes; separate revenue currencies; mobile navigation and content lists without horizontal page overflow.

- [ ] **Step 4: Review final diff and repository state**

Run `git diff --check`, `git status --short`, and inspect every changed file. Preserve unrelated concurrent Funding and environment changes.

- [ ] **Step 5: Commit verification fixes**

```bash
git add AdminPanel Shared supabase
git commit -m "test: verify production admin workflows"
```
