# Cresciva Studio Admin UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the priority Cresciva admin pages into a youthful editorial workspace while preserving the existing navy sidebar, data behavior, permissions, and administrative safeguards.

**Architecture:** Add an AdminPanel-local presentation layer made of focused studio components and CSS tokens, then compose those primitives into the existing Blog, Resources, Directory Profiles, Users, Funding, and Payments pages. Keep query hooks, mutations, routing, and shared public-site styles unchanged; only derive display metrics from data each page already loads.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Vitest, Testing Library, TanStack Query, lucide-react, `@fontsource/fraunces`

**Spec:** `docs/superpowers/specs/2026-08-25-admin-studio-ui-design.md`

## Global Constraints

- Preserve the existing deep navy sidebar as the fixed visual anchor.
- Keep all React Query hooks, mutations, permission checks, routes, dialogs, audit events, and toast messages behaviorally unchanged.
- Keep new tokens and styles local to AdminPanel so the public Frontend application is not redesigned.
- Do not add backend, Supabase schema, RPC, Edge Function, or query-contract changes.
- Use orange, cobalt, and lime as accents; no gradients, glassmorphism, or purple.
- Pair status color with text or icons, preserve visible focus, and respect `prefers-reduced-motion`.
- Preserve horizontal table scrolling and the current mobile sidebar sheet.
- Preserve unrelated working-tree edits, including the in-progress AdminLayout and AdminDashboard changes.

---

### Task 1: Studio presentation foundation

**Files:**
- Create: `AdminPanel/src/components/studio/StudioPageHeader.tsx`
- Create: `AdminPanel/src/components/studio/StudioMetricStrip.tsx`
- Create: `AdminPanel/src/components/studio/StudioToolbar.tsx`
- Create: `AdminPanel/src/components/studio/StudioDataPanel.tsx`
- Create: `AdminPanel/src/components/studio/StudioAvatar.tsx`
- Create: `AdminPanel/src/components/studio/StudioPrimitives.test.tsx`
- Create: `AdminPanel/src/styles/studio.css`
- Modify: `AdminPanel/src/main.tsx`
- Modify: `AdminPanel/package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `StudioPageHeader({ eyebrow, title, description, actions, accent })`
- Produces: `StudioMetricStrip({ items })` where each item has `label`, `value`, optional `hint`, `icon`, and `tone`
- Produces: `StudioToolbar({ children, className })`, `StudioDataPanel({ children, className })`, and `StudioAvatar({ name, src, className })`

- [ ] **Step 1: Write the failing primitive tests**

```tsx
render(<StudioPageHeader eyebrow="Content studio" title="Stories worth sharing" description="Manage the publishing desk." />);
expect(screen.getByRole("heading", { name: "Stories worth sharing" })).toBeInTheDocument();
expect(screen.getByText("Content studio")).toBeInTheDocument();

render(<StudioMetricStrip items={[{ label: "Published", value: 12, icon: Newspaper, tone: "cobalt" }]} />);
expect(screen.getByText("Published")).toBeInTheDocument();
expect(screen.getByText("12")).toBeInTheDocument();

render(<StudioAvatar name="Amaka Okafor" />);
expect(screen.getByText("AO")).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test and confirm the missing-module failure**

Run: `npm test --workspace AdminPanel -- StudioPrimitives.test.tsx`

Expected: FAIL because the studio modules do not exist.

- [ ] **Step 3: Implement the focused component interfaces**

```tsx
export type StudioTone = "orange" | "cobalt" | "lime" | "navy";

export interface StudioMetricItem {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: StudioTone;
}
```

`StudioPageHeader` renders one `h1`, an uppercase eyebrow, description, optional action slot, and a short accent stroke. `StudioMetricStrip` maps semantic `article` elements and always renders text labels. `StudioAvatar` renders an image when `src` is present and otherwise derives at most two initials from `name`.

- [ ] **Step 4: Add AdminPanel-local visual tokens and typography**

Install Fraunces with `npm install @fontsource/fraunces --workspace AdminPanel`. Import `@fontsource/fraunces/latin-700.css` and `./styles/studio.css` from `AdminPanel/src/main.tsx` after the shared stylesheet.

Define `.admin-studio` tokens for cream canvas, navy ink, cobalt, lime, orange, border, paper grain, editorial title font, data-panel tables, staggered entry motion, mobile wrapping, and reduced-motion overrides. Do not override `:root` or shared public-site classes.

- [ ] **Step 5: Run the primitive tests**

Run: `npm test --workspace AdminPanel -- StudioPrimitives.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the foundation**

```bash
git add AdminPanel/src/components/studio AdminPanel/src/styles/studio.css AdminPanel/src/main.tsx AdminPanel/package.json package-lock.json
git commit -m "feat(admin): add Cresciva Studio UI primitives"
```

---

### Task 2: Integrate the studio shell without replacing the sidebar

**Files:**
- Modify: `AdminPanel/src/components/AdminLayout.tsx`
- Modify: `AdminPanel/src/components/AdminLayout.test.tsx`

**Interfaces:**
- Consumes: `.admin-studio`, `.studio-canvas`, and studio typography tokens from Task 1.
- Preserves: existing sidebar search, role filtering, profile menu, sign-out, mobile sheet, and navigation routes.

- [ ] **Step 1: Extend the layout test with the shell contract**

```tsx
const main = screen.getByRole("main");
expect(main).toHaveClass("studio-canvas");
expect(document.querySelector(".admin-studio")).toBeInTheDocument();
expect(screen.getByRole("navigation", { name: "Admin navigation" })).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test and confirm it fails on the missing classes**

Run: `npm test --workspace AdminPanel -- AdminLayout.test.tsx`

Expected: existing behavior tests pass; the new shell assertions fail.

- [ ] **Step 3: Apply the shell classes around the existing implementation**

Add `admin-studio` to the root shell, `studio-sidebar` to both desktop and mobile sidebars, and `studio-canvas` to the `main` element. Preserve the user's in-progress navigation search and profile dropdown. Refine active navigation classes and top-bar border/background only; do not change nav labels, group order, width, or access logic.

- [ ] **Step 4: Run the layout tests**

Run: `npm test --workspace AdminPanel -- AdminLayout.test.tsx`

Expected: all layout, search, active-link, and profile-menu tests PASS.

- [ ] **Step 5: Commit the shell integration**

```bash
git add AdminPanel/src/components/AdminLayout.tsx AdminPanel/src/components/AdminLayout.test.tsx
git commit -m "feat(admin): apply studio workspace shell"
```

---

### Task 3: Refactor Blog and Resources into the content studio

**Files:**
- Create: `AdminPanel/src/pages/AdminContentStudio.test.tsx`
- Modify: `AdminPanel/src/pages/AdminBlog.tsx`
- Modify: `AdminPanel/src/pages/AdminResources.tsx`

**Interfaces:**
- Consumes: all Task 1 primitives.
- Preserves: `contentPermissions`, all mutation hooks, audit logging, delete confirmations, status filters, and search behavior.

- [ ] **Step 1: Write mocked page tests for the new content hierarchy**

Mock the query and role hooks with one published and one draft row, render inside `MemoryRouter`, then assert:

```tsx
expect(screen.getByRole("heading", { name: "Stories worth sharing" })).toBeInTheDocument();
expect(screen.getByText("Content studio")).toBeInTheDocument();
expect(screen.getByText("Published stories")).toBeInTheDocument();
expect(screen.getByRole("searchbox", { name: "Search posts by title" })).toBeInTheDocument();

expect(screen.getByRole("heading", { name: "Tools worth keeping" })).toBeInTheDocument();
expect(screen.getByText("Resource library")).toBeInTheDocument();
expect(screen.getByRole("searchbox", { name: "Search resources by title" })).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused tests and confirm the old headings fail**

Run: `npm test --workspace AdminPanel -- AdminContentStudio.test.tsx`

Expected: FAIL because the pages still render the shared generic `PageHeader`.

- [ ] **Step 3: Refactor Blog presentation**

Replace `PageHeader` with `StudioPageHeader` using eyebrow `Content studio`, title `Stories worth sharing`, and action label `New story`. Derive four metrics from `data`: published count, draft count, archived count, and total views. Wrap the existing search/select controls in `StudioToolbar`, the existing semantic table in `StudioDataPanel`, increase thumbnail prominence, and retain every permission-gated action and dialog unchanged.

- [ ] **Step 4: Refactor Resources presentation**

Use eyebrow `Resource library`, title `Tools worth keeping`, and action label `New resource`. Derive published count, draft count, total downloads, and gated count. Keep the status tabs and search logic, but compose them within `StudioToolbar`. Use larger cover cells and the shared data panel while preserving permission and audit behavior.

- [ ] **Step 5: Run content tests and static checks**

Run: `npm test --workspace AdminPanel -- AdminContentStudio.test.tsx`

Run: `npm run typecheck --workspace AdminPanel`

Expected: PASS.

- [ ] **Step 6: Commit the content pages**

```bash
git add AdminPanel/src/pages/AdminBlog.tsx AdminPanel/src/pages/AdminResources.tsx AdminPanel/src/pages/AdminContentStudio.test.tsx
git commit -m "feat(admin): redesign content management pages"
```

---

### Task 4: Refactor Directory Profiles and Users into a people-first community desk

**Files:**
- Create: `AdminPanel/src/pages/AdminCommunityStudio.test.tsx`
- Modify: `AdminPanel/src/pages/AdminProfiles.tsx`
- Modify: `AdminPanel/src/pages/AdminUsers.tsx`

**Interfaces:**
- Consumes: Task 1 studio primitives and existing `AdminProfileRow`, `AdminUserRow`, and `subscriptionActive` types/functions.
- Preserves: moderation mutations, profile visibility/flag/feature behavior, access and role mutations, expiry dialog, current-user admin protection, and public-profile links.

- [ ] **Step 1: Write mocked community page tests**

```tsx
expect(screen.getByRole("heading", { name: "Meet the people building next" })).toBeInTheDocument();
expect(screen.getByText("Community desk")).toBeInTheDocument();
expect(screen.getByText("Featured profiles")).toBeInTheDocument();

expect(screen.getByRole("heading", { name: "The community behind Cresciva" })).toBeInTheDocument();
expect(screen.getByText("Member access")).toBeInTheDocument();
expect(screen.getByRole("searchbox", { name: "Search users by email or business" })).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused tests and confirm the new hierarchy fails**

Run: `npm test --workspace AdminPanel -- AdminCommunityStudio.test.tsx`

Expected: FAIL on the new headings and metric labels.

- [ ] **Step 3: Refactor Directory Profiles**

Use `StudioPageHeader` with eyebrow `Community desk` and title `Meet the people building next`. Derive all, active, featured, and flagged counts from the already-loaded profile list. Compose search and status/sector filters in `StudioToolbar`. Make `BusinessCell` use `StudioAvatar`, show founder detail, and preserve the existing semantic table and all moderation controls.

- [ ] **Step 4: Refactor Users**

Use eyebrow `Member access` and title `The community behind Cresciva`. Derive total returned users, active subscriptions, staff roles, and users without access. Use `StudioAvatar` in the identity cell, keep the debounced search, role badges, dropdown actions, and expiry dialog behavior unchanged.

- [ ] **Step 5: Run community tests and type checking**

Run: `npm test --workspace AdminPanel -- AdminCommunityStudio.test.tsx`

Run: `npm run typecheck --workspace AdminPanel`

Expected: PASS.

- [ ] **Step 6: Commit the community pages**

```bash
git add AdminPanel/src/pages/AdminProfiles.tsx AdminPanel/src/pages/AdminUsers.tsx AdminPanel/src/pages/AdminCommunityStudio.test.tsx
git commit -m "feat(admin): redesign community management pages"
```

---

### Task 5: Refactor Funding and Payments into a trustworthy finance desk

**Files:**
- Create: `AdminPanel/src/pages/AdminFinanceStudio.test.tsx`
- Modify: `AdminPanel/src/pages/AdminFunding.tsx`
- Modify: `AdminPanel/src/pages/AdminPayments.tsx`

**Interfaces:**
- Consumes: Task 1 studio primitives and existing Funding/Payment query response types.
- Preserves: funding create/edit/delete dialogs, source verification rules, status mutations, reconciliation read-only behavior, refresh behavior, and discrepancy warnings.

- [ ] **Step 1: Write mocked finance page tests**

```tsx
expect(screen.getByRole("heading", { name: "Money moves, made visible" })).toBeInTheDocument();
expect(screen.getByText("Opportunity radar")).toBeInTheDocument();
expect(screen.getByText("AI drafts")).toBeInTheDocument();

expect(screen.getByRole("heading", { name: "Payments pulse" })).toBeInTheDocument();
expect(screen.getByText("Reconciliation healthy")).toBeInTheDocument();
expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused tests and confirm the new hierarchy fails**

Run: `npm test --workspace AdminPanel -- AdminFinanceStudio.test.tsx`

Expected: FAIL on the new headings and labels.

- [ ] **Step 3: Refactor Funding presentation**

Use eyebrow `Opportunity radar`, title `Money moves, made visible`, and the existing create action. Derive open/rolling, closing-soon, AI draft, and verified counts from `rows`. Wrap filters in `StudioToolbar`, keep the AI review warning, and present the existing opportunity table through `StudioDataPanel`. Do not alter verification or publication logic.

- [ ] **Step 4: Refactor Payments presentation**

Use `StudioPageHeader` with title `Payments pulse` and the existing refresh button. Render the three reconciliation summary values through `StudioMetricStrip`, preserve the healthy/attention panel semantics, and restyle recent payments with `StudioDataPanel`. Keep the page explicitly read-only and keep access discrepancy warnings visually prominent.

- [ ] **Step 5: Run finance tests and type checking**

Run: `npm test --workspace AdminPanel -- AdminFinanceStudio.test.tsx`

Run: `npm run typecheck --workspace AdminPanel`

Expected: PASS.

- [ ] **Step 6: Commit the finance pages**

```bash
git add AdminPanel/src/pages/AdminFunding.tsx AdminPanel/src/pages/AdminPayments.tsx AdminPanel/src/pages/AdminFinanceStudio.test.tsx
git commit -m "feat(admin): redesign funding and payment operations"
```

---

### Task 6: Full verification and reference-driven polish

**Files:**
- Modify if verification reveals issues: `AdminPanel/src/styles/studio.css`
- Modify if verification reveals issues: priority page files from Tasks 2-5

**Interfaces:**
- Verifies all prior tasks; introduces no new feature interfaces.

- [ ] **Step 1: Run the complete AdminPanel quality suite**

Run: `npm run lint --workspace AdminPanel`

Run: `npm run typecheck --workspace AdminPanel`

Run: `npm test --workspace AdminPanel`

Run: `npm run build --workspace AdminPanel`

Expected: all commands exit 0.

- [ ] **Step 2: Start the AdminPanel and verify desktop routes**

Run: `npm run dev --workspace AdminPanel -- --host 127.0.0.1`

Verify `/admin/blog`, `/admin/resources`, `/admin/profiles`, `/admin/users`, `/admin/funding`, and `/admin/payments` at a desktop viewport. Compare hierarchy, color rhythm, density, and sidebar preservation with the three files in `AdminPanel/design-references/`.

- [ ] **Step 3: Verify responsive and accessibility behavior**

Check 390px, 768px, and 1440px widths. Confirm mobile menu access, toolbar wrapping, horizontal table scroll, visible keyboard focus, text-plus-color status signals, no hover-only actions, and reduced-motion behavior.

- [ ] **Step 4: Apply only evidence-driven polish**

Fix overflow, contrast, spacing, or focus issues found in Steps 2-3. Do not change data behavior or broaden scope.

- [ ] **Step 5: Re-run quality gates after polish**

Run: `npm run lint --workspace AdminPanel && npm run typecheck --workspace AdminPanel && npm test --workspace AdminPanel && npm run build --workspace AdminPanel`

Expected: exit 0.

- [ ] **Step 6: Commit verified polish**

```bash
git add AdminPanel/src
git commit -m "fix(admin): polish studio UI responsiveness"
```

