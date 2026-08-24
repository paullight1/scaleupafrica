# Admin Panel & Content Platform — Guide

This document is the reference for the Cresciva **admin panel**, the **resource
library**, the **blog**, and the marketing/legal pages added alongside them. It covers the
data model, access control, routes, content workflows, and how to extend the system.

> Status: admin panel is the Phase-2 layer described in `docs/plans/07-backend-nestjs-drizzle.md`.
> It runs entirely on the **Supabase client + admin RPCs** (RLS-enforced). The NestJS API does
> not own admin endpoints yet; when it does, only the `queryFn` bodies in `AdminPanel/src/hooks/queries/admin*`
> change — the UI stays the same.

---

## 1. Overview

The admin panel lives at **`/admin`** and gives staff a single place to:

- **Dashboard** — KPIs (users, subscriptions, profiles, content, leads, newsletter) and 30-day
  trend charts (signups, funding searches, page views) from analytics.
- **Resources CMS** — create/edit/publish templates, playbooks, guides, ebooks, articles,
  checklists; upload cover images and downloadable PDFs; mark resources "gated" (email capture
  before download, HubSpot-style).
- **Blog CMS** — markdown posts with cover, category, tags, SEO fields, draft/publish workflow.
- **Funding** — manage the admin-curated `funding_opportunities` list and review AI-generated
  drafts before publishing them to members.
- **Directory Profiles** — moderate SME profiles: feature, hide, flag, delete.
- **Users** — see every user with subscription + role, grant/revoke access, set expiry, assign
  admin/editor roles.
- **Leads** — inbox for contact-form submissions and gated-resource downloads; export CSV.
- **Newsletter** — Brevo-backed campaign studio, audience segmentation, consent operations,
  delivery reporting and provider health.
- **Settings** — announcement banner + feature flags (`site_settings`).
- **Audit Log** — every mutating admin action is recorded.

Public surfaces added at the same time: **`/resources`**, **`/resources/:slug`**, **`/blog`**,
**`/blog/:slug`**, **`/about`**, **`/contact`**, **`/privacy`**, **`/terms`**. The site header and
footer link to them; the footer also carries the newsletter signup.

---

## 2. Access control (RBAC)

Roles are stored in their **own table** (`user_roles`) — never on `profiles` — and checked via
`SECURITY DEFINER` SQL functions so RLS policies can call them without recursion. This is the
Supabase-recommended pattern and the single source of truth for authorization.

| Role       | Can do                                                                 |
|------------|-----------------------------------------------------------------------|
| `admin`    | Everything: users, roles, subscriptions, profiles, settings, audit, all content |
| `editor`   | Content only: resources, blog, funding (the CMS)                       |
| `moderator`| Reserved for future use                                               |
| `user`     | Default; no admin access                                              |

SQL helpers (in `supabase/migrations/20260720120000_admin_panel_foundation.sql`):

- `has_role(uuid, app_role) → bool`
- `is_admin(uuid) → bool`  (= `has_role(_, 'admin')`)
- `is_staff(uuid) → bool`  (= admin OR editor — the CMS boundary)

**Frontend guard:** `AdminPanel/src/components/AdminGuard.tsx` gates `/admin/*`. `require="staff"`
(default) allows admins + editors into the CMS; `require="admin"` locks Users/Profiles/Leads/
Newsletter/Settings/Audit to admins. The guard is **UX only** — the real boundary is RLS. Never
rely on the guard for security.

**Client role hook:** `src/hooks/useRole.tsx` → `{ roles, isAdmin, isEditor, isStaff, loading }`.

### Granting the first / additional admins

The migration seeds `nwosupaul3@gmail.com` as the first admin (no-op if that user doesn't exist
yet — re-run the seed statement after they sign up). To grant more, either:

- Use the **Users** page (admin → "Make admin" / "Make editor"), or
- Run SQL:
  ```sql
  insert into public.user_roles (user_id, role)
  select id, 'admin' from auth.users where email = 'someone@example.com'
  on conflict (user_id, role) do nothing;
  ```

An admin cannot remove their **own** admin role from the UI (guard against lockout).

---

## 3. Data model

All DDL lives in `supabase/migrations/` (the **only** owner of schema — Drizzle in `Backend/` mirrors
it but never authors DDL). The admin foundation migration is
`20260720120000_admin_panel_foundation.sql`.

| Table                     | Purpose                                                        | Who writes |
|---------------------------|---------------------------------------------------------------|------------|
| `user_roles`              | RBAC assignments                                              | admin |
| `resources`              | Resource library items (+ PDF/asset + cover)                  | staff |
| `blog_posts`             | Blog posts (markdown)                                         | staff |
| `funding_opportunities`  | Admin-curated funding (extended by `…140000` with AI/verify)  | staff |
| `leads`                  | Contact + gated-download + demo submissions                  | anyone inserts; admin reads |
| `newsletter_subscribers` | Consent authority + Brevo contact sync state                 | public capture; admin operates |
| `newsletter_consent_events` | Append-only subscribe/suppress history                    | server writes; admin reads |
| `newsletter_campaigns` | Draft revisions, rendered content and delivery state            | admin via Edge Function |
| `newsletter_campaign_recipients` | Immutable per-campaign audience snapshots              | server writes; admin reads |
| `newsletter_campaign_events` | Deduplicated Brevo delivery/engagement events              | webhook writes; admin reads |
| `newsletter_sync_jobs` | Retry/reconciliation state for Brevo contacts                    | server writes; admin reads |
| `analytics_events`       | Lightweight product analytics                                | anyone inserts; admin reads |
| `site_settings`          | Announcement banner, feature flags                           | admin writes; public reads |
| `admin_audit_log`        | Record of admin actions                                      | staff inserts; admin reads |

`profiles` gained moderation columns: `status` (`active`/`hidden`/`flagged`), `featured`,
`view_count` (plus `slug`, `show_email/phone/whatsapp` from the directory migration).

### RLS summary

- **Content** (`resources`, `blog_posts`): public reads rows where `status='published'`; staff
  read/write everything.
- **`funding_opportunities`**: after migration `…140000` the published feed is **member-gated**
  (active subscription) — staff can read/write all.
- **`leads` / `newsletter_subscribers` / `analytics_events`**: `anon`+`authenticated` may INSERT
  (public forms/analytics); only admins read. Newsletter uses upsert with `ignoreDuplicates`.
- **`site_settings`**: public SELECT (so the banner/flags render for everyone), admin write.

### Storage buckets (public read; staff write via `is_staff` RLS)

- `content-media` — cover images for resources/blog.
- `resource-files` — downloadable PDFs/assets.

Uploads go through `AdminPanel/src/components/FileUpload.tsx`, which writes to the bucket and returns
the public URL, file name and size.

---

## 4. Admin RPCs

`SECURITY DEFINER`, each self-guarded with `is_admin(auth.uid())` so a non-admin gets empty/zero
results even if they call directly:

- `admin_dashboard_stats() → jsonb` — all dashboard KPIs in one round-trip.
- `admin_timeseries(_metric text, _days int) → (day date, count bigint)` — daily series for
  `signups`, `page_view`, `funding_search`, `resource_view`, `resource_download`, `blog_view`.
- `admin_list_users(_search text, _limit int)` — user roster joined with profile, subscription and
  role flags (reads `auth.users`, which is otherwise not client-readable).

Public, best-effort counters (any visitor may call): `increment_resource_metric(_id, 'view'|'download')`,
`increment_post_views(_id)`, `increment_profile_views(_id)`.

---

## 5. Frontend structure

The admin panel is its **own Vite app**, built and deployed separately from the public site. It
shares the design system, auth and Supabase client with `Frontend/` through the `Shared/`
workspace — see the repository layout table in `CLAUDE.md`.

```
AdminPanel/
  index.html              # noindex/nofollow; assets under /admin/
  vite.config.ts          # base: "/admin/", dev server on :8081
  src/
    App.tsx               # router — routes keep their full /admin/… paths
    main.tsx              # entry; pulls @shared/styles/index.css
    components/
      AdminGuard.tsx      # route gate (staff | admin)
      AdminLayout.tsx     # sidebar + topbar shell; renders <Outlet/>
      FileUpload.tsx      # staff uploader → content-media / resource-files
    pages/
      AdminDashboard.tsx    AdminResources.tsx   AdminResourceEdit.tsx
      AdminBlog.tsx         AdminBlogEdit.tsx     AdminFunding.tsx
      AdminProfiles.tsx     AdminUsers.tsx        AdminLeads.tsx
      AdminNewsletter.tsx   AdminSettings.tsx     AdminAuditLog.tsx
    hooks/queries/
      adminDashboard.ts  adminUsers.ts  adminResources.ts
      adminBlog.ts       adminOps.ts
```

Consumed from `Shared/` via `@shared/*`:

```
Shared/src/
  hooks/useRole.tsx       useAuth.tsx
  lib/analytics.ts        # trackEvent(), slugify()
  lib/audit.ts            # logAdminAction()
  lib/markdown.tsx        # dependency-free Markdown renderer for CMS content
  lib/crossApp.tsx        # siteUrl() / <CrossAppRedirect> — leaving for the public app
  components/ui/          components/common/
```

Routes are registered in `AdminPanel/src/App.tsx` under a `/admin` layout route wrapped by
`AdminGuard` + `AdminLayout`; admin-only sub-areas are wrapped again with `AdminGuard require="admin"`.
Routes deliberately keep the `/admin` prefix rather than using a router `basename`, so every
in-panel link reads the same as its URL. Anything outside `/admin` belongs to the public app and is
handed off with a real document navigation, not a react-router link.

### Newsletter command center

`/admin/newsletter` is administrator-only and has four URL-addressable workspaces:

- **Overview** — subscriber growth, delivery/click rates, recent campaigns and failed contact syncs.
- **Campaigns** — searchable status list plus a structured block editor with desktop/mobile preview. Authors choose all active subscribers or a source/date segment, send a revision-specific test, then send immediately or schedule through Brevo.
- **Subscribers** — search/filter by consent, Brevo sync, signup source and dates; export CSV, inspect append-only consent history, explicitly resubscribe, unsubscribe or retry provider sync.
- **Settings** — masked configuration health, master list/sender IDs, last sync/webhook timestamps and guarded audience reconciliation.

Campaign content is validated block JSON, not arbitrary HTML. Supabase owns consent and campaign snapshots; only `newsletter-admin` can use service-role/provider credentials. `brevo-webhook` deduplicates at-least-once events and applies unsubscribe, complaint and hard-bounce suppression locally. See `docs/EMAIL.md` for provider setup and deployment order.

### Conventions the admin UI follows

- Data via the **Supabase client** + **TanStack Query** (centralized query keys). Reads always
  `throw` on error so `<ErrorState onRetry>` renders — never a silent empty state.
- Shared UI: `PageHeader`, `SEO`, `StatCard`, `EmptyState`, `ErrorState`, `LoadingState`/
  `TableSkeleton` from `src/components/common/*`; shadcn/ui primitives.
- Design system: orange `primary`, `navy`, `ink-strong` headings (`font-display`/Sora),
  `rounded-xl`, `shadow-soft`. The `src/test/anti-slop.test.ts` build test forbids the legacy
  forest/gold/`font-serif` tokens and a few slop patterns — stay within the tokens.
- Every create/update/delete/publish/role-change/access-grant calls `logAdminAction(...)`.

---

## 6. Content workflows

### Resources (HubSpot-style library)

1. **Admin → Resources → New resource.** Set title (slug auto-generates), type, category, topics,
   excerpt. Upload a cover (→ `content-media`) and a downloadable PDF (→ `resource-files`).
2. Toggle **Gated** to require an email before download. Toggle **Featured** to surface it.
3. **Save as draft** or **Publish** (sets `published_at`). Published resources appear at
   `/resources` and `/resources/:slug`.
4. Public detail page: free resources download directly; gated resources capture a **lead**
   (`leads.source = 'resource_download'`) then reveal the download. Views/downloads increment via
   the counter RPCs and log `analytics_events`.

### Blog

Admin → Blog → New post. Markdown body with a live **Preview** tab, cover, category, tags, and SEO
fields. Draft/publish workflow mirrors resources. Public at `/blog` and `/blog/:slug` with a
newsletter CTA and related posts.

### Funding

`/admin/funding` manages `funding_opportunities`. Manual entries publish immediately (member-gated
on the public feed). AI-generated batches land as `source='ai', status='draft'`; staff review, then
publish (`status='published'`, `last_verified_at=now()`, `verified_by=<uid>`). See HANDOFF §5 for the
planned `refresh-funding-feed` job.

---

## 7. Analytics

`src/lib/analytics.ts` exposes `trackEvent(type, opts)` (fire-and-forget; never throws) and a
per-browser `session_id`. Event types: `page_view`, `funding_search`, `resource_view`,
`resource_download`, `blog_view`, `signup`, `profile_create`, `newsletter_signup`, `lead_submit`.
The dashboard reads these through the admin RPCs. To add a metric to a chart, add its `event_type`
to the `admin_timeseries` union (SQL) and call it from the dashboard hook.

---

## 8. Extending the admin panel

To add a new admin module:

1. **Schema:** add a table in a new `supabase/migrations/<timestamp>_*.sql` with RLS
   (`is_staff`/`is_admin`) and, if needed, an `updated_at` trigger. Mirror it in
   `Backend/src/db/schema.ts`.
2. **Types:** after applying the migration, regenerate `Shared/src/integrations/supabase/types.ts`
   (`supabase gen types typescript …`). Until then, use the repo cast convention
   `const db = supabase as unknown as SupabaseClient;`.
3. **Page:** add `AdminPanel/src/pages/AdminX.tsx` (return content only — `AdminLayout` provides chrome),
   plus a hooks file in `AdminPanel/src/hooks/queries/`.
4. **Nav + route:** add a `NavItem` to `NAV` in `AdminLayout.tsx` and a `<Route>` in `AdminPanel/src/App.tsx`
   (wrap in `AdminGuard require="admin"` if admin-only).
5. **Audit:** call `logAdminAction(...)` on every mutation.

---

## 9. Deployment checklist

- Apply `supabase/migrations/20260720120000_admin_panel_foundation.sql` (and the other pending
  migrations listed in `docs/plans/HANDOFF.md §1`) via the Supabase SQL editor or `supabase db push`.
- Confirm the `content-media` and `resource-files` storage buckets exist and are public-read.
- Ensure at least one admin exists (seed or Users page).
- Regenerate `types.ts` from the live schema to drop the temporary casts.
- `npm run build`, `npm run lint`, `npm test` must pass (all from the repo root).
- Serve `AdminPanel/dist/` at `/admin/` with an SPA fallback to `/admin/index.html`.
- For a separate Vercel project connected to this monorepo, set **Root Directory** to
  `AdminPanel`, keep **Framework Preset** as Vite, **Build Command** as `npm run build`, and
  **Output Directory** as `dist`. Keep **Include source files outside of the Root Directory**
  enabled because the panel imports `../Shared`.
- A separate admin host opens at `/admin/`; its `/` route forwards there without leaving the
  admin origin. Set `VITE_SITE_URL` on the admin project and `VITE_ADMIN_URL` on the public-site
  project so deliberate cross-app links use the correct hosts.
- Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and
  `VITE_SUPABASE_PROJECT_ID` to all three Vercel environments (Production, Preview, Development).
- Apply `20260824145932_newsletter_command_center.sql`, configure the four server-only `BREVO_*`
  secrets, and deploy `send-email`, `newsletter-admin` and `brevo-webhook` before enabling campaigns.

### Cross-app origins

Frontend and AdminPanel are separate bundles with separate routers. Deliberate links between them
go through `Shared/src/lib/crossApp.tsx` (`siteUrl` / `adminUrl`) and use real document navigation.
Admin sign-in and MFA stay inside the AdminPanel bundle.

Same-origin deploys need no configuration. Local development can open the standalone panel at
`http://localhost:8081/admin/` or use the public site's proxy at
`http://localhost:8080/admin/`. The two `.env.development` files provide optional cross-app
origins for "Admin" and "View site" links. Both dev servers must be running (`npm run dev` and
`npm run dev:admin`).

---

## 10. Security notes

- Authorization is enforced by **RLS + `SECURITY DEFINER` functions**, not the React guard.
- Admin RPCs re-check `is_admin(auth.uid())` internally.
- `auth.users` is never exposed to the client except through `admin_list_users` (admin-guarded).
- CMS markdown is rendered by a dependency-free renderer that **escapes HTML first** (raw HTML in
  content is inert) — safe for trusted staff authors.
- Public forms (`leads`, `newsletter_subscribers`, `analytics_events`) allow anonymous INSERT only;
  reads are admin-only. Consider adding rate-limiting at the NestJS layer for these endpoints.
