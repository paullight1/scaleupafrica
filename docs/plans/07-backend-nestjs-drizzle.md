# 07 — Backend: NestJS + Drizzle in front of Supabase Postgres

> Implements FOUNDATION §5 (locked decision). Read `00-FOUNDATION.md` first.
> **Decision recap:** Build a NestJS API using Drizzle ORM pointed at the *existing* Supabase
> Postgres. Keep Supabase auth (JWT), storage, and the DB itself. NestJS verifies the Supabase JWT
> and enforces access rules in code (mirroring RLS). The frontend migrates server reads/writes to
> the NestJS API incrementally; the Supabase JS client stays for auth + storage uploads. RLS stays
> enabled as defense-in-depth.

---

## 1. Goal

A production-ready NestJS API that owns all server reads/writes for **profiles / directory,
subscriptions, funding (including the AI aggregation currently in the `aggregate-funding` edge
function), and the Paystack webhook** — without breaking the working app at any point during the
cutover. Auth (sign-in/up, OAuth, session refresh) and storage uploads remain on the Supabase
client. Nothing about the database is forked: same Postgres, same RLS, same triggers.

### Scope

**In:**
- `server/` NestJS app: scaffold, config, Drizzle layer, Supabase-JWT guard + role guard.
- Drizzle schema covering every existing `public` table (hand-authored from the migrations).
- Two *new* API-owned tables: `funding_results` (AI result cache) and `payments` (stub —
  finalized by plan 06), plus a `profiles.slug` column (needed by plan 04) — all added through
  the existing `supabase/migrations/` pipeline.
- REST endpoints: profiles (list/search/paginate/get-by-slug/get-own/upsert-own/delete-own),
  subscriptions (read own), funding (search + cached results + curated list), Paystack webhook
  skeleton, health.
- Frontend seam: typed API client in `src/lib/api/*` + TanStack Query hooks in
  `src/lib/queries/*`, env-flag cutover per domain.
- Tests (guard unit tests, endpoint integration tests vs a local Supabase DB), deployment recipe.

**Out (explicitly):**
- Auth flows / session handling (plan 02 — stays on Supabase client).
- Storage uploads (stay on Supabase client; storage RLS already scopes writes per-uid folder).
- Admin panel endpoints (`/api/v1/admin/*`) — Phase 2, after the four core domains are stable.
  The admin UI keeps using the Supabase client + admin RPCs until then (they still work).
- Resources/blog/leads/newsletter endpoints — same: Phase 2. Tables are still modeled in Drizzle
  now so Phase 2 is additive.
- Paystack checkout UI + business logic (plan 06 owns it; we provide the webhook mount point,
  raw-body handling, and signature verification helper).

---

## 2. Project layout, build, run

### 2.1 Where the API lives — decision: `server/` at repo root (NOT a workspace monorepo)

Rationale: the repo is a flat Vite app synced with Lovable; converting to npm/pnpm workspaces
(`apps/web` + `apps/api`) would move every existing file, break the Lovable sync, `vite.config.ts`
paths, and CI muscle memory — high risk, zero user value. Instead:

```
scaleupafrica/
  src/                    # existing Vite app (untouched location)
  server/                 # NEW — NestJS app with its OWN package.json + lockfile
  shared/                 # NEW — zod contracts shared by both (see §5.2)
  supabase/               # unchanged; remains the ONLY owner of SQL DDL
  docs/plans/
```

`server/` is installed and built independently (`cd server && npm i`). The root `package.json`
gains only convenience scripts. **Package manager: npm** for `server/` (CLAUDE.md commands are
npm; bun.lockb exists but npm is the documented path — do not introduce a third lockfile format).

### 2.2 Server file tree (create)

```
server/
  package.json
  tsconfig.json                  # includes ../shared
  nest-cli.json
  drizzle.config.ts
  vitest.config.ts               # unplugin-swc for decorator metadata
  .env.example                   # committed; .env git-ignored
  src/
    main.ts                      # bootstrap: helmet, CORS, global ZodValidationPipe, rawBody
    app.module.ts
    config/env.ts                # zod-validated process.env → typed Config
    db/
      db.module.ts               # global module providing the Drizzle instance
      client.ts                  # postgres-js + drizzle()
      schema.ts                  # ALL table definitions (§3)
    auth/
      auth.module.ts
      supabase-jwt.guard.ts      # global guard; @Public() opts out
      roles.guard.ts             # @Roles('admin'|'editor'|...) checks user_roles
      roles.service.ts           # role lookup + 60s in-memory TTL cache
      decorators.ts              # @Public(), @CurrentUser(), @Roles()
      types.ts                   # AuthUser = { id: string; email?: string }
    profiles/
      profiles.module.ts / .controller.ts / .service.ts
      slug.ts                    # slugify + collision suffix
    subscriptions/
      subscriptions.module.ts / .controller.ts / .service.ts   # single isActive() source
    funding/
      funding.module.ts / .controller.ts / .service.ts
      ai-gateway.service.ts      # ports aggregate-funding prompt + fetch
      sanitize.ts                # URL allowlist (http/https only), string clamps
    webhooks/
      webhooks.module.ts
      paystack.controller.ts     # POST /api/v1/webhooks/paystack (plan 06 fills handler)
      paystack-signature.ts      # HMAC-SHA512 verify against raw body
    health/health.controller.ts  # GET /api/v1/health → { ok, db }
  test/
    jwt-fixtures.ts              # sign HS256 test tokens
    app.e2e-spec.ts et al.
```

### 2.3 Scripts, ports, dev orchestration

`server/package.json` scripts:

```json
{
  "start:dev": "nest start --watch",
  "build": "nest build",
  "start:prod": "node dist/main.js",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:pull": "drizzle-kit pull",        // drift check only — NEVER push/generate (see §3.4)
  "lint": "eslint ."
}
```

Root `package.json` additions (modify):

```json
{
  "dev:api": "npm --prefix server run start:dev",
  "dev:all": "concurrently -n web,api -c blue,green \"npm run dev\" \"npm run dev:api\""
}
```
(devDependency `concurrently` at root.)

- **Ports:** Vite dev `8080` (unchanged) · API `3001` (`PORT` env).
- **Dev proxy (modify `vite.config.ts`):** `server.proxy: { "/api": "http://localhost:3001" }`.
  The frontend always calls relative `/api/...` in dev (no CORS in dev); in prod it uses
  `VITE_API_URL` as the base (see §5.1).

### 2.4 Environment (`server/.env.example`)

```bash
PORT=3001
NODE_ENV=development

# Supabase Postgres — use the Supavisor TRANSACTION pooler (port 6543).
# postgres-js must be created with { prepare: false } in transaction mode.
# Format: postgresql://postgres.<project-ref>:<db-password>@aws-0-<region>.pooler.supabase.com:6543/postgres
DATABASE_URL=

# JWT verification — support BOTH signing modes:
#   - New projects / rotated keys: asymmetric (ES256/RS256) via JWKS — only SUPABASE_URL needed.
#   - Legacy: HS256 shared secret from Dashboard → Settings → API → JWT Secret.
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_JWT_SECRET=            # optional; enables HS256 fallback

# Privileged Supabase ops (auth admin API, storage admin). NOT used for DB access.
SUPABASE_SERVICE_ROLE_KEY=

# Funding AI gateway (ported from the edge function's LOVABLE_API_KEY env)
AI_GATEWAY_URL=https://ai.gateway.lovable.dev/v1/chat/completions
AI_GATEWAY_KEY=
AI_MODEL=google/gemini-2.5-pro

# Paystack (plan 06)
PAYSTACK_SECRET_KEY=

# CORS — comma-separated allowed origins for prod
CORS_ORIGINS=http://localhost:8080
```

Validate all of this at boot with zod in `config/env.ts`; crash fast on missing values.
**None of these ever appear in a `VITE_`-prefixed var.**

Key facts an implementer must respect:

- The direct Postgres connection **bypasses RLS** (it connects as the `postgres` role, not
  `anon`/`authenticated`, and `auth.uid()` is NULL). That is *why* every access rule must be
  enforced in code (§4.3) — and why the admin RPCs (`admin_dashboard_stats`,
  `admin_list_users`, `admin_timeseries`) **cannot be called from the API**: they self-guard with
  `public.is_admin(auth.uid())`, which is NULL over a direct connection, so they return empty.
  Phase 2 reimplements those queries in Drizzle behind the `@Roles('admin')` guard instead.
- `prepare: false` is mandatory with the transaction pooler (6543). If you prefer session mode
  (port 5432 pooler), prepared statements work but keep the pool small (`max: 10`) —
  Supavisor session slots are limited.

### 2.5 Deployment target — recommendation: **Railway** (or Render as equal fallback)

- Long-lived Node process (we hold a Postgres pool and an in-memory role cache) → not a good fit
  for serverless/edge. Railway/Render give: Dockerless Node deploys, env var UI, health checks,
  logs, cheap hobby tier, and region selection — **pick the region closest to the Supabase
  project region** to keep query latency low (target users on 3G already pay enough latency).
- Build command `cd server && npm ci && npm run build`, start `node server/dist/main.js`,
  health check `/api/v1/health`.
- Frontend stays wherever it deploys today; set `VITE_API_URL=https://api.<domain>` at build time
  and add that web origin to `CORS_ORIGINS`.

---

## 3. Drizzle layer

### 3.1 Connection (`server/src/db/client.ts`)

```ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const sql = postgres(env.DATABASE_URL, { prepare: false, max: 10 });
export const db = drizzle(sql, { schema });
export type Db = typeof db;
```

Provided app-wide via a global `DbModule` (`@Inject(DB)` token) so services get a typed handle
and tests can substitute a test-DB instance.

### 3.2 Schema strategy — decision: **hand-author, verify with `drizzle-kit pull`**

- Hand-author `schema.ts` from the SQL below (the migrations are small and fully known; a
  hand-authored file gives clean names/relations and no generated noise).
- Run `drizzle-kit pull` once during implementation into a scratch dir and diff against the
  hand-authored file to catch typos; keep `db:pull` as an ongoing **drift check** (CI-optional).
- **Never run `drizzle-kit generate/push/migrate` against shared tables.** See §3.4.

`server/drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle/_introspect",          // scratch output for pull; git-ignored
  dbCredentials: { url: process.env.DATABASE_URL! },
  schemaFilter: ["public"],              // never touch auth/storage schemas
});
```

### 3.3 Table definitions (`server/src/db/schema.ts`) — column by column

Derived from `supabase/migrations/20260713035330_*.sql` and
`20260720120000_admin_panel_foundation.sql`. Notes: FKs to `auth.users` are **not** modeled as
Drizzle references (the `auth` schema stays outside our schema file); the DB still enforces them.
`CHECK` constraints live in SQL; mirror them in the zod contracts, not in Drizzle.

```ts
import {
  pgTable, pgEnum, uuid, text, boolean, integer, timestamp, jsonb, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const appRole = pgEnum("app_role", ["admin", "editor", "moderator", "user"]);

// ---- profiles (existing + admin cols + NEW slug from §3.5) ----
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique(),          // FK → auth.users(id) ON DELETE CASCADE (DB-enforced)
  businessName: text("business_name").notNull(),
  founderName: text("founder_name"),
  founderPhotoUrl: text("founder_photo_url"),
  logoUrl: text("logo_url"),
  country: text("country").notNull(),
  sector: text("sector").notNull(),
  shortDescription: text("short_description"),
  longDescription: text("long_description"),
  website: text("website"),
  email: text("email"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  instagram: text("instagram"),
  linkedin: text("linkedin"),
  twitter: text("twitter"),
  keywords: text("keywords").array().default(sql`'{}'::text[]`),
  status: text("status").notNull().default("active"),  // CHECK ('active'|'hidden'|'flagged') in SQL
  featured: boolean("featured").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  slug: text("slug").unique(),                          // NEW — added by migration in §3.5
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(), // DB trigger maintains
});

// ---- subscriptions ----
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique(),
  hasAccess: boolean("has_access").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- user_roles (RBAC) ----
export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  role: appRole("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("user_roles_user_id_role_key").on(t.userId, t.role)]);

// ---- resources ----
export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  type: text("type").notNull().default("article"),      // CHECK in SQL (template|playbook|guide|ebook|article|checklist|toolkit|webinar|case-study)
  category: text("category"),
  excerpt: text("excerpt"),
  content: text("content"),
  coverImageUrl: text("cover_image_url"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSizeKb: integer("file_size_kb"),
  topics: text("topics").array().notNull().default(sql`'{}'::text[]`),
  gated: boolean("gated").notNull().default(false),
  status: text("status").notNull().default("draft"),    // CHECK (draft|published|archived)
  featured: boolean("featured").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  downloadCount: integer("download_count").notNull().default(0),
  readTimeMin: integer("read_time_min"),
  authorId: uuid("author_id"),
  authorName: text("author_name"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("resources_status_idx").on(t.status), index("resources_type_idx").on(t.type)]);

// ---- blog_posts ----
export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content"),
  coverImageUrl: text("cover_image_url"),
  category: text("category"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  status: text("status").notNull().default("draft"),
  featured: boolean("featured").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  readTimeMin: integer("read_time_min"),
  authorId: uuid("author_id"),
  authorName: text("author_name"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("blog_posts_status_idx").on(t.status)]);

// ---- funding_opportunities (admin-curated) ----
export const fundingOpportunities = pgTable("funding_opportunities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  funder: text("funder").notNull(),
  type: text("type"),
  summary: text("summary"),
  amount: text("amount"),
  opens: text("opens"),
  deadline: text("deadline"),
  eligibility: text("eligibility"),
  url: text("url"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  countryFocus: text("country_focus").array().notNull().default(sql`'{}'::text[]`),
  status: text("status").notNull().default("published"),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- leads ----
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  email: text("email").notNull(),
  company: text("company"),
  message: text("message"),
  source: text("source").notNull().default("contact"),  // CHECK (contact|resource_download|demo|other)
  resourceId: uuid("resource_id"),                       // FK → resources ON DELETE SET NULL
  status: text("status").notNull().default("new"),       // CHECK (new|contacted|archived)
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- newsletter_subscribers ----
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  status: text("status").notNull().default("subscribed"), // CHECK (subscribed|unsubscribed)
  source: text("source"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- analytics_events ----
export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(),
  path: text("path"),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  userId: uuid("user_id"),
  sessionId: text("session_id"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("analytics_events_type_created_idx").on(t.eventType, t.createdAt.desc())]);

// ---- site_settings ----
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by"),
});

// ---- admin_audit_log ----
export const adminAuditLog = pgTable("admin_audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: uuid("actor_id"),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  details: jsonb("details").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("admin_audit_log_created_idx").on(t.createdAt.desc())]);

// ---- NEW: funding_results (API-owned AI cache — created in §3.5) ----
export const fundingResults = pgTable("funding_results", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  keywords: text("keywords").notNull(),                 // normalized (trimmed/lowercased)
  opportunities: jsonb("opportunities").notNull(),      // validated Opportunity[]
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => [index("funding_results_user_created_idx").on(t.userId, t.createdAt.desc())]);

// ---- NEW: payments (stub — columns FINALIZED BY PLAN 06; this is the coordination proposal) ----
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull().default("paystack"),
  reference: text("reference").notNull().unique(),      // Paystack tx reference (idempotency key)
  amount: integer("amount").notNull(),                  // minor units (kobo/pesewas)
  currency: text("currency").notNull().default("NGN"),
  status: text("status").notNull().default("pending"),  // CHECK (pending|success|failed)
  planCode: text("plan_code"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  raw: jsonb("raw").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

### 3.4 Migration strategy — no conflict with Supabase-managed migrations

**Single rule: `supabase/migrations/*.sql` is the only DDL pipeline.** Drizzle is a *read/write
query layer over an externally-owned schema*, never a migration tool here.

- Existing tables: Drizzle schema mirrors them; `drizzle-kit pull` is used only to *verify* the
  mirror (drift check). `generate`/`push`/`migrate` are never run — do not create a
  `drizzle/meta` journal at all.
- **New objects this plan needs** (`profiles.slug`, `funding_results`, `payments`) are created by
  a *new SQL file in `supabase/migrations/`* (§3.5), applied with the normal
  `supabase db push` / dashboard flow. The Drizzle schema is updated in the same PR. Ownership is
  documented per table in a header comment in `schema.ts`:
  - Supabase/Lovable-era tables → schema changes continue via supabase migrations, then mirrored.
  - `funding_results`, `payments` → *logically* owned by the API team, but DDL still ships as
    supabase migration files so there is exactly one migration history.
- If Lovable regenerates `src/integrations/supabase/types.ts`, nothing breaks — that file remains
  the type source for the *remaining* Supabase-client calls only.

### 3.5 New SQL migration (create `supabase/migrations/20260721000000_api_layer.sql`)

```sql
-- 07-backend: profiles.slug (plan 04 dependency), funding_results, payments
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Backfill: slugified business_name; append 6-char id prefix on collision
UPDATE public.profiles p SET slug = sub.slug FROM (
  SELECT id,
    CASE WHEN count(*) OVER (PARTITION BY base) > 1
         THEN base || '-' || left(id::text, 6) ELSE base END AS slug
  FROM (SELECT id, trim(both '-' FROM regexp_replace(lower(business_name), '[^a-z0-9]+', '-', 'g')) AS base
        FROM public.profiles) b
) sub WHERE p.id = sub.id AND p.slug IS NULL;

-- funding_results: AI aggregation cache. Only the API touches it → RLS on, NO
-- anon/authenticated policies (deny-by-default backstop; API's direct connection bypasses RLS).
CREATE TABLE public.funding_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keywords TEXT NOT NULL,
  opportunities JSONB NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX funding_results_user_created_idx ON public.funding_results (user_id, created_at DESC);
ALTER TABLE public.funding_results ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.funding_results TO service_role;

-- payments: same posture (API/webhook writes only). Columns finalized by plan 06.
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'paystack',
  reference TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  plan_code TEXT,
  paid_at TIMESTAMPTZ,
  raw JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.payments TO service_role;
```

Slug policy (coordinate with plan 04): slug is generated server-side on first profile create
(`slugify(business_name)`, collision → `-xxxxxx` id suffix) and is **immutable afterwards**
(stable share URLs). Renaming a business does not change the slug.

---

## 4. Auth: verifying the Supabase JWT + mirroring RLS

### 4.1 `SupabaseJwtGuard` (global guard; `@Public()` opts routes out)

Library: **`jose`** (no passport — one small guard is simpler and testable).

Verification logic:

1. Read `Authorization: Bearer <token>`; missing/malformed → 401.
2. Inspect the (unverified) header `alg`:
   - `ES256`/`RS256` → verify against a cached `createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))` (jose caches + re-fetches on unknown `kid`, which
     transparently handles Supabase key rotation).
   - `HS256` → verify with `SUPABASE_JWT_SECRET` (legacy projects). If the secret is unset, 401.
3. Enforce claims: `iss === \`${SUPABASE_URL}/auth/v1\``, `aud === "authenticated"`, `exp` valid
   (jose does exp/nbf), `sub` present and a UUID.
4. Attach `req.user = { id: payload.sub, email: payload.email }`. **The user id used in every
   query comes from this object — never from a request body or query param.**

Failure modes return 401 with a stable body `{ error: { code: "UNAUTHENTICATED", message } }` —
never leak verification detail.

### 4.2 `RolesGuard` + `RolesService`

- `@Roles("admin")` / `@Roles("admin", "editor")` metadata → `RolesGuard` runs after the JWT
  guard, calls `RolesService.getRoles(userId)` (Drizzle `select role from user_roles where
  user_id = $1`), with a 60-second in-memory TTL cache keyed by userId (roles change rarely;
  cache bounds DB chatter). Missing role → 403 `FORBIDDEN`.
- Mirrors SQL `has_role()` / `is_admin()` / `is_staff()`: "staff" = `admin || editor`.

### 4.3 Authorization matrix (code must mirror these RLS rules exactly)

| Resource | RLS rule (source of truth) | API enforcement |
|---|---|---|
| profiles SELECT | anyone | `@Public()`; list filters `status = 'active'` for non-staff (public UX; RLS technically allows all — API is *stricter*, which is fine) |
| profiles INSERT/UPDATE/DELETE | `auth.uid() = user_id` | routes operate only on `WHERE user_id = req.user.id`; payload `user_id` is ignored/forbidden |
| profiles admin override | `is_admin()` ALL | Phase 2 admin routes with `@Roles('admin')` |
| subscriptions SELECT | own row (or admin) | `GET /subscriptions/me` → `WHERE user_id = req.user.id` |
| subscriptions WRITE | service_role / admin only | **no public write route.** Only the Paystack webhook handler (signature-verified, plan 06) and Phase-2 admin routes may write |
| user_roles | read own; admin manage | used internally by RolesService only in Phase 1 |
| resources / blog / funding_opportunities SELECT | published, or staff | public GETs filter `status = 'published'` |
| leads / newsletter INSERT | anyone | Phase 2 (stays on Supabase client meanwhile) |
| funding_results / payments | no client policies | auth'd owner-scoped access via API only |
| Active subscription rule | `has_access && (expires_at IS NULL OR expires_at > now())` | **single implementation**: `SubscriptionsService.isActive()` — Funding endpoints and the DTO `active` field both call it. After cutover the FE stops computing this itself and the edge fn is retired → the rule lives in exactly one runtime place (+ SQL fn as backstop). Update the CLAUDE.md note accordingly. |

### 4.4 Guard unit-test hooks

Tokens for tests are minted with `jose.SignJWT` + HS256 test secret (`test/jwt-fixtures.ts`);
the guard accepts an injected config so tests point it at the test secret/issuer.

---

## 5. API surface (REST — decision: REST, not tRPC)

REST wins here: 4 plans consume it with plain TanStack Query, it needs no client codegen, is
debuggable with curl, and keeps the Paystack webhook (plain HTTP POST) in the same idiom. Global
prefix `/api/v1`. JSON errors: `{ error: { code, message, fields? } }`.

**Validation: Zod** (already a dependency of the frontend; one validation language everywhere)
via a global `ZodValidationPipe` — not class-validator. Contracts live in **`shared/contracts/`**:

```
shared/contracts/
  profiles.ts        # ProfileSchema, ProfileUpsertSchema, ProfileListQuerySchema, ProfileCardSchema
  subscriptions.ts   # SubscriptionSchema  (incl. computed `active: boolean`)
  funding.ts         # OpportunitySchema (ports the edge-fn shape incl. past_recipients etc.),
                     # FundingSearchSchema { keywords: string.max(200) }
  common.ts          # Paginated<T> { items, total, page, pageSize }, ErrorSchema
```

Wiring: `vite.config.ts` + `tsconfig.app.json` alias `@shared/*` → `shared/*`; server
`tsconfig.json` adds the same path + includes `../shared/**/*` (nest build via tsc handles it).
Fallback if build friction appears: keep schemas in `server/src/contracts/` and mirror *types
only* into `src/lib/api/types.ts` — acceptable, but try shared first.

### 5.1 Endpoints

| Method & path | Auth | Behavior |
|---|---|---|
| `GET /api/v1/health` | public | `{ ok: true, db: true }` (runs `select 1`) |
| `GET /api/v1/profiles` | public | Directory list/search. Query: `q` (matches business_name / founder_name / sector / country via `ilike`, `%_` escaped), `country`, `sector`, `page` (default 1), `pageSize` (default 24, max 60), `sort` (`newest` default, `featured` = featured desc → newest). Filters `status='active'`. Returns `Paginated<ProfileCard>` (card = subset the Directory grid needs; excludes long_description). Replaces today's client-side "fetch 200 rows and filter in JS" (`src/pages/Directory.tsx`). |
| `GET /api/v1/profiles/:slug` | public | Full public profile by slug; 404 if missing/`hidden`. Increments `view_count` (fire-and-forget `UPDATE ... SET view_count = view_count + 1`). Plan 04 consumes. |
| `GET /api/v1/profiles/me` | user | Own profile or 404 (FE treats 404 as "no profile yet"). |
| `PUT /api/v1/profiles/me` | user | **Upsert own** (Drizzle `insert ... onConflictDoUpdate(target: userId)`). Body = `ProfileUpsertSchema` (ports the zod schema in `CreateProfile.tsx`, plus URL sanitization: website/linkedin/photo URLs must parse as http/https — reject `javascript:` etc.). `user_id`, `status`, `featured`, `view_count`, `slug` are NOT accepted from the body. Generates slug on first insert. Returns the full row. |
| `DELETE /api/v1/profiles/me` | user | Deletes own row (204). |
| `GET /api/v1/subscriptions/me` | user | `{ hasAccess, expiresAt, active }` — `active` computed by `SubscriptionsService.isActive()`. Row missing (edge case: trigger raced) → `{ hasAccess: false, active: false }`. |
| `POST /api/v1/funding/search` | user + active sub | Absorbs the `aggregate-funding` edge fn. Body `{ keywords }` (≤200 chars). Flow: ① `isActive()` else 403 `SUBSCRIPTION_REQUIRED`; ② cache lookup: newest `funding_results` row for `(user_id, normalized keywords)` with `expires_at > now()` → return it (`cached: true`); ③ else call AI gateway (same system/user prompts as the edge fn, ported verbatim), `zod`-validate each opportunity with `OpportunitySchema` (drop invalid items; sanitize `url`/`past_recipients[].website` to http/https-only, else blank), store row with `expires_at = now() + 24h`, return `{ opportunities, cached: false, createdAt }`. Gateway 429/402 pass through as today. Rate-limit: 5/min/user (`@nestjs/throttler`). |
| `GET /api/v1/funding/latest` | user + active sub | Most recent unexpired cached result (or 204). Powers plan 03's dashboard pillar and plan 05's "results persist across reload". |
| `GET /api/v1/funding/opportunities` | public | Admin-curated `funding_opportunities` where `status='published'`, featured first. Plan 05 may blend these above AI results. |
| `POST /api/v1/webhooks/paystack` | signature | **Skeleton in this plan; handler logic owned by plan 06.** Mounted with raw body (`NestFactory.create(AppModule, { rawBody: true })`); verifies `x-paystack-signature` = HMAC-SHA512(`PAYSTACK_SECRET_KEY`, rawBody) with `crypto.timingSafeEqual`; invalid → 401. Valid → hand `event` to `PaymentsService.handleEvent()` (plan 06: idempotent on `payments.reference`, flips `subscriptions.has_access`/`expires_at` on `charge.success`). Always 200 after signature check to stop Paystack retries. |

Phase 2 (separate PR, not blocking): `/api/v1/admin/*` (dashboard stats, user roster, moderation,
content CRUD — reimplementing the admin RPC queries in Drizzle behind `@Roles`), plus
resources/blog/leads/newsletter public endpoints.

### 5.2 CORS & hardening (in `main.ts`)

- `app.enableCors({ origin: env.CORS_ORIGINS.split(","), credentials: false, methods: "GET,POST,PUT,DELETE,OPTIONS" })` — auth is a Bearer header, no cookies, so no `credentials`.
- `helmet()`; JSON body limit 256kb; `@nestjs/throttler` global 100 req/min/IP; request logging
  (pino via `nestjs-pino`) with no PII bodies logged.

---

## 6. Frontend migration seam (consumed by plans 03/04/05/06)

### 6.1 Typed API client — create

```
src/lib/api/
  client.ts        # base fetch wrapper
  profiles.ts      # listProfiles(params), getProfileBySlug, getMyProfile, upsertMyProfile, deleteMyProfile
  subscriptions.ts # getMySubscription
  funding.ts       # searchFunding, getLatestFunding, listCuratedFunding
  types.ts         # re-exports from @shared/contracts
src/lib/queries/
  useDirectory.ts  # useQuery(["profiles", params], keepPreviousData) — pagination-friendly
  useProfile.ts    # useMyProfile, useProfileBySlug, useUpsertProfile (mutation + invalidate)
  useSubscription.ts
  useFunding.ts    # useFundingSearch (mutation), useLatestFunding
```

`client.ts` behavior:

- Base URL: `import.meta.env.VITE_API_URL ?? ""` (empty in dev → relative `/api` → Vite proxy).
- Auth: before each request, `const { data: { session } } = await supabase.auth.getSession()`
  (supabase-js refreshes expired tokens itself); attach `Authorization: Bearer
  ${session.access_token}` when present. **This is the only place the Supabase client and the API
  client touch.**
- On 401 once: force `supabase.auth.refreshSession()` and retry a single time; still 401 → throw
  typed `ApiError { code, message, fields }`.
- Every hook surfaces `error` so pages render `<ErrorState>` (FOUNDATION §2 — never an empty or
  paywall state on fetch failure; that P1 bug in `Funding.tsx` dies here).

### 6.2 Incremental cutover — feature flags per domain

Env flag `VITE_API_DOMAINS` (comma list, e.g. `directory,profiles,subscriptions,funding`;
absent = legacy Supabase path). Helper `src/lib/api/flags.ts` → `useApiFor("directory")`. Each
migrated hook branches internally, so **pages never know which backend served them** and the app
cannot fully break — reverting = removing a token from an env var and rebuilding.

Cutover order (each step shippable alone):

1. **directory** — `Directory.tsx` (via plan 04's rewrite) switches to `useDirectory()` with
   server search/pagination. Read-only, zero risk.
2. **profiles** — `CreateProfile.tsx` load + save → `useMyProfile` / `useUpsertProfile`
   (replaces the manual insert/update branch with the API upsert). Storage uploads in
   `ImageUploadCrop` stay on the Supabase client (unchanged).
3. **subscriptions** — `Funding.tsx` / dashboard read `useSubscription()` and use its `active`
   field (stop computing expiry client-side).
4. **funding** — `Funding.tsx` calls `searchFunding` instead of
   `supabase.functions.invoke("aggregate-funding")`; retire the edge function *only after* this
   flag has been on in prod for a week.
5. Flags default-on for all four → later PR deletes the legacy branches + the edge function.

Stays on the Supabase JS client permanently: `useAuth` (sessions, OAuth, sign-out — plan 02),
storage uploads (`profile-media` bucket, RLS-scoped), and — until Phase 2 — admin panel,
resources/blog/leads/newsletter reads.

---

## 7. Stays vs moves + security review

### 7.1 Boundary summary

| Concern | Stays in Supabase | Moves to NestJS |
|---|---|---|
| Auth (sessions, OAuth, JWT minting) | ✅ (client + GoTrue) | — (only *verifies* JWTs) |
| Storage `profile-media` etc. | ✅ (client uploads, storage RLS) | — |
| RLS policies / triggers / SQL fns | ✅ kept verbatim as defense-in-depth | rules re-enforced in code (§4.3) |
| DDL / migrations | ✅ `supabase/migrations/` only | never (Drizzle read/verify only) |
| profiles, subscriptions reads/writes | during transition | ✅ end state |
| `aggregate-funding` edge fn | ✅ until step 4 of cutover | ✅ `FundingService` (then delete fn) |
| Paystack webhook | — | ✅ (plan 06 logic) |
| Admin panel data access | ✅ (Supabase client + RPCs) | Phase 2 |

### 7.2 Security review checklist (implementer must verify each)

- **SQL injection:** all queries through Drizzle's parameterized builder; the only raw `sql``
  fragments allowed are constant expressions (defaults, `view_count + 1`). `ilike` search input
  is escaped (`%`,`_`,`\`) before interpolation into the *pattern parameter* (still bound, never
  concatenated into SQL text).
- **RLS bypass awareness:** the API's DB role ignores RLS → every handler derives ownership from
  `req.user.id` (JWT `sub`), never from client-supplied ids; upsert strips `user_id`/`status`/
  `featured`/`slug` from bodies (zod `.strict()` on write schemas).
- **JWT:** signature + `iss` + `aud` + `exp` all enforced; JWKS cached with rotation handling;
  HS256 secret only via env; tokens never logged.
- **Secrets:** `DATABASE_URL`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`,
  `AI_GATEWAY_KEY`, `PAYSTACK_SECRET_KEY` live only in `server/.env` / host env — grep-gate CI
  check that none appear under `src/` or in any `VITE_` var. `.env` git-ignored;
  `.env.example` committed.
- **Webhook:** raw-body HMAC-SHA512 with `timingSafeEqual`; idempotency via unique
  `payments.reference`; handler never trusts amounts/plan from the event without checking against
  expected plan config (plan 06 detail).
- **AI output:** zod-validated; URLs http(s)-allowlisted (blocks `javascript:`/`data:`);
  array/string length clamps; invalid items dropped, not fatal (FOUNDATION §4 validation rule).
- **DoS:** throttler (global + funding), body-size limit, `pageSize` cap, keywords ≤200 chars.
- **CORS:** explicit origin allowlist; no wildcard in prod.
- **New tables backstop:** `funding_results`/`payments` have RLS enabled with zero client
  policies → unreachable via the anon/publishable key even if the FE misbehaves.

---

## 8. Dependencies on / from other plans

- **Provides to 03 (dashboard):** `GET /profiles/me`, `GET /subscriptions/me`,
  `GET /funding/latest` + the query hooks in §6.1.
- **Provides to 04 (directory/profiles):** server search/pagination, `GET /profiles/:slug`
  (+ slug column/backfill), view-count increment. Plan 04 must not ship its slug routes before
  §3.5 is applied.
- **Provides to 05 (funding):** `POST /funding/search` with 24h cache, `GET /funding/latest`,
  curated list; validated/sanitized opportunity shape (`shared/contracts/funding.ts`).
- **Provides to 06 (payments):** webhook mount + signature verification + `payments` table stub +
  the *only* write path to `subscriptions`. Plan 06 finalizes `payments` columns (amend §3.5's
  migration in the same PR window if needed) and implements `PaymentsService.handleEvent()`.
- **Consumes from 02 (auth):** unchanged Supabase session; `useAuth()` shape.
- **Independent of 01/08** (pure backend), but plan 08's env docs must document `VITE_API_URL`.

## 9. Test plan

Server tests use **Vitest** (repo convention) — `server/vitest.config.ts` with `unplugin-swc`
so decorator metadata works.

1. **Unit — `SupabaseJwtGuard`:** valid HS256 token → `req.user.id` set; expired → 401; wrong
   `aud`/`iss` → 401; garbage/absent header → 401; ES256 token verified against a local JWKS
   fixture. (`test/jwt-fixtures.ts` signs tokens with jose.)
2. **Unit — `RolesGuard`/`RolesService`:** admin passes `@Roles('admin')`; plain user → 403;
   cache TTL respected (mock db).
3. **Unit — pure logic:** `slug.ts` (diacritics, collisions), `sanitize.ts` (rejects
   `javascript:`, keeps https), `SubscriptionsService.isActive()` (null expiry, future, past),
   Paystack signature verify (valid/invalid/tampered body).
4. **Integration (supertest against a real DB):** `supabase start` local stack → `DATABASE_URL`
   `postgresql://postgres:postgres@127.0.0.1:54322/postgres` (migrations auto-applied; `auth`
   schema present so FKs work). Seed users via inserts into `auth.users` (or GoTrue admin API).
   Cases: profiles list search/pagination/status filter; get-by-slug 200/404; upsert-own
   creates→updates same row and *cannot* set `user_id`/`featured`; `DELETE /profiles/me` only
   deletes caller's row; `subscriptions/me` for absent row; funding search 403 without sub, 200
   with sub + cache hit on second call (AI gateway mocked with `undici` MockAgent); webhook 401
   on bad signature.
5. **Frontend:** existing vitest suite — add tests for `client.ts` (token attach, 401
   retry-once, ApiError mapping) and `flags.ts` branching (mock fetch + supabase session).
6. **Manual smoke script** (`server/README` section): curl each endpoint against dev with a real
   session token copied from the browser.

## 10. Acceptance criteria

- `cd server && npm run build && npm test` green; root `npm run build`, `lint`, `test` still green.
- `npm run dev:all` serves web on 8080 + API on 3001; `/api/v1/health` returns `{ ok: true, db: true }` through the Vite proxy.
- Drizzle `db:pull` drift check shows no diff vs `schema.ts` after §3.5 is applied.
- With `VITE_API_DOMAINS=directory,profiles,subscriptions,funding`: directory search/pagination,
  profile create/edit, paywall check, and funding search all work end-to-end with **zero calls**
  to `supabase.from()`/`functions.invoke()` for those domains (verify in devtools network tab);
  auth + image upload still work via Supabase.
- With the flag unset, the app behaves exactly as before (legacy path intact).
- Funding search: second identical search within 24h returns `cached: true` without hitting the
  AI gateway; results survive reload via `/funding/latest`.
- A user's JWT cannot read another user's subscription, mutate another user's profile, or write
  `subscriptions` through any route (integration tests prove it).
- Deployed API (Railway/Render) reachable from the deployed frontend origin; CORS blocks others.

## 11. Ordered implementation checklist

**A. Scaffold**
- [ ] `server/`: Nest CLI scaffold, npm, tsconfig (+ `../shared` include), eslint, vitest+swc config.
- [ ] `config/env.ts` zod env validation; `.env.example`; git-ignore `server/.env`, `server/drizzle/_introspect`.
- [ ] `main.ts`: global prefix `/api/v1`, helmet, CORS from env, `rawBody: true`, ZodValidationPipe, throttler, pino.
- [ ] Root scripts `dev:api` / `dev:all` (+ `concurrently`); `vite.config.ts` `/api` proxy + `@shared` alias.
- [ ] `health` controller.

**B. DB layer**
- [ ] Write `supabase/migrations/20260721000000_api_layer.sql` (§3.5); apply to the project.
- [ ] Author `db/schema.ts` (§3.3); `db/client.ts` (`prepare:false`, `max:10`); global `DbModule`.
- [ ] Run `drizzle-kit pull` → diff → fix mirrors until clean.

**C. Auth**
- [ ] `SupabaseJwtGuard` (jose, JWKS + HS256 fallback), `@Public()`, `@CurrentUser()`; register globally.
- [ ] `RolesService` (+TTL cache), `RolesGuard`, `@Roles()`.
- [ ] Guard unit tests (test §9.1–2).

**D. Profiles + directory**
- [ ] `shared/contracts/{common,profiles}.ts`.
- [ ] `ProfilesService`: list (search/filter/paginate/sort), bySlug (+view count), getOwn, upsertOwn (slug gen, strict zod), deleteOwn. Controller + throttling.
- [ ] Integration tests (test §9.4 profile cases).

**E. Subscriptions**
- [ ] `shared/contracts/subscriptions.ts`; `SubscriptionsService.isActive()` + `GET /subscriptions/me`; tests.

**F. Funding**
- [ ] `shared/contracts/funding.ts` (Opportunity schema ported from edge fn output spec).
- [ ] `AiGatewayService` (prompts ported verbatim; env-driven model/key), `sanitize.ts`.
- [ ] `FundingService`: sub gate → cache lookup → gateway → validate/sanitize → persist (24h TTL); `search`/`latest`/`opportunities` routes; per-user throttle; tests with mocked gateway.

**G. Webhook mount (for plan 06)**
- [ ] `paystack.controller.ts` + `paystack-signature.ts` + `payments` drizzle access; handler delegates to a stub `PaymentsService`; signature tests.

**H. Frontend seam**
- [ ] `src/lib/api/client.ts` (token attach, 401-retry-once, ApiError) + domain modules + `flags.ts`.
- [ ] `src/lib/queries/*` hooks with flag branching (legacy Supabase path preserved).
- [ ] Wire pages (with plans 03/04/05): directory → profiles → subscriptions → funding, one flag at a time; FE tests (test §9.5).

**I. Deploy & finish**
- [ ] Deploy API to Railway/Render (region = Supabase region), env vars, health check; set `VITE_API_URL` + `CORS_ORIGINS` for prod.
- [ ] Secrets grep-gate in CI (§7.2); update CLAUDE.md (commands, new architecture note, the "subscription rule in 3 places" note → "SubscriptionsService is the runtime source").
- [ ] After 1 week of flags-on in prod: delete legacy Supabase read/write branches for the four domains and the `aggregate-funding` edge fn.
