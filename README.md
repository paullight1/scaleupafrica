# Cresciva

Cresciva is a Pan-African SME platform: a public, searchable directory where founders
publish one credible business profile, plus subscription-gated **funding intelligence** — AI-curated
grants, accelerators, and fellowships relevant to African SMEs. Browsing the directory is free and
open; the Funding Radar is available to members with an active subscription.

## Stack

- **Frontend:** Vite + React 18 + TypeScript, [shadcn/ui](https://ui.shadcn.com) (Radix + Tailwind CSS),
  React Router v6, TanStack Query, Framer Motion.
- **Backend (current):** [Supabase](https://supabase.com) — auth, Postgres with Row-Level Security,
  storage, and edge functions (Deno).
- **API server (in progress):** a NestJS + Drizzle service under `Backend/` is being introduced —
  see `docs/plans/07` for scope and migration status.
- **Testing:** Vitest + Testing Library (jsdom).

## Getting started

**Prerequisites:** Node.js 20+ (bun also supported).

This is an npm workspaces monorepo — always run commands from the repo root.

```sh
# 1. Install every workspace
npm install

# 2. Configure environment (per web app)
cp Frontend/.env.example Frontend/.env      # then fill in your Supabase project values
cp AdminPanel/.env.example AdminPanel/.env

# 3. Start whichever app you're working on
npm run dev          # public site   http://localhost:8080
npm run dev:admin    # admin panel   http://localhost:8081/admin/
npm run dev:api      # NestJS API    http://localhost:3001
```

## Scripts

Run these from the repo root:

| Script                | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `npm run dev`         | Public site dev server on port 8080                     |
| `npm run dev:admin`   | Admin panel dev server on port 8081                     |
| `npm run og`          | Rescreenshot the landing hero into `og-banner.png`      |
| `npm run dev:api`     | NestJS API dev server on port 3001                      |
| `npm run build`       | Production build of both web apps                       |
| `npm run build:web`   | Build the public site only → `Frontend/dist/`           |
| `npm run build:admin` | Build the admin panel only → `AdminPanel/dist/`         |
| `npm run build:api`   | Build the API → `Backend/dist/`                         |
| `npm run lint`        | ESLint across both web apps                             |
| `npm test`            | Run every workspace's tests once                        |
| `npm run assets`      | Regenerate branding assets from their SVG sources       |

Target one workspace with `--workspace`, e.g. `npm run test --workspace Shared`, or a single file
with `npm test --workspace Frontend -- src/lib/url.test.ts`.

## Environment

Web-app variables (all prefixed `VITE_`, safe to expose to the client). Both `Frontend/.env` and
`AdminPanel/.env` need the Supabase trio:

| Variable                        | Description                                              |
| ------------------------------- | -------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Supabase project URL                                     |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key                            |
| `VITE_SUPABASE_PROJECT_ID`      | Supabase project ref/ID                                  |
| `VITE_SITE_URL`                 | AdminPanel only — public site origin                      |
| `VITE_ADMIN_URL`                | Frontend only — admin panel origin                        |
| `VITE_SITE_ORIGIN`              | Frontend only — public origin used in canonical/og:* URLs |

`VITE_SITE_ORIGIN` is the public origin stamped into `<link rel="canonical">`, `og:url` and
`og:image` — set it to the production host. It defaults to `https://cresciva.vercel.app`; the same
default is repeated in `Shared/src/lib/siteMeta.ts`, `Frontend/vite.config.ts` and
`scripts/generate-sitemap.mjs`, so change all three together. It deliberately does **not** fall back
to `window.location.origin`: that made every preview deploy declare itself canonical and hand
crawlers share images that die with the preview.

`VITE_SITE_URL` and `VITE_ADMIN_URL` are **cross-app origins**. The two apps have separate routers, so links between them
are real document navigations; each app has to know where the other is served. In production they
share one host (site at `/`, panel at `/admin/`), so both stay unset and the links are rooted paths.
In dev they are two Vite servers on two ports, so both are set in the committed `.env.development`
files — Vite loads those for `vite dev` only, never for a build, so `localhost` can't leak into a
deploy. Without them the panel bounces anonymous users to `:8081/auth` and its own dev server
(base `/admin/`) answers *"did you mean to visit /admin/auth?"*.

Edge-function secrets (set on the Supabase function, never in the client bundle): the
`aggregate-funding` function reads an AI-gateway API key from its environment to curate funding
opportunities. See `supabase/functions/aggregate-funding/`.

## Project structure

```
Frontend/                public site (Vite SPA, port 8080)
  src/pages/             directory, funding, auth, dashboard, resources, blog, marketing
  src/components/        landing, directory, funding, dashboard, billing, blog sections
  src/lib/ src/hooks/    app-specific queries, schemas and helpers
  public/                favicon set, og-banner, robots.txt, sitemap

AdminPanel/              staff admin panel (Vite SPA, port 8081, built under /admin/)
  src/pages/             dashboard, resources/blog/funding CMS, users, leads, newsletter, audit
  src/components/        AdminGuard, AdminLayout, FileUpload
  src/hooks/queries/     admin data hooks

Shared/                  imported by both apps as @shared/* — never the reverse
  src/components/ui/     shadcn/ui primitives
  src/components/common/ cross-app primitives (SEO, states, PageHeader, StatCard)
  src/hooks/             useAuth, useRole, sign-out cleanup registry
  src/integrations/      Supabase client + generated types
  src/lib/               utils, analytics, audit, routes, cross-app navigation
  src/styles/index.css   design tokens
  tailwind.preset.ts     the design system as a Tailwind preset
  contracts/             zod API contracts (also imported by Backend)
  src/test/              design-system guards that sweep all three apps

Backend/                 NestJS + Drizzle API (port 3001)
supabase/migrations/     SQL schema + RLS policies
supabase/functions/      Deno edge functions
scripts/                 favicon sources, og screenshot, sitemap/robots generation
docs/plans/              implementation plans
```

## Deploy

Both web apps are static SPAs.

```sh
npm run build            # Frontend/dist/ and AdminPanel/dist/
```

Host on Vercel, Netlify, or Cloudflare Pages:

- Serve `Frontend/dist/` at the site root, with an SPA fallback to `/index.html`.
- Serve `AdminPanel/dist/` at `/admin/`, with an SPA fallback to `/admin/index.html`. The panel is
  built with Vite `base: "/admin/"`, so its assets already resolve under that prefix. To host it on
  a separate domain instead, serve it at that host's root and set `VITE_SITE_URL` in
  `AdminPanel/.env` so "back to site" and the sign-in redirect point at the public app.

Apply database changes with `supabase db push`, and deploy edge functions with
`supabase functions deploy aggregate-funding`.

To regenerate the favicon set from its SVG sources:

```sh
npm run assets
```

The social share image is separate — it's a real screenshot of the live landing hero, not a
hand-drawn card, so it can't drift from the product:

```sh
npm run og            # starts the dev server, captures it, writes Frontend/public/og-banner.png
npm run og -- <url>   # capture an already-running server instead
```

Rerun it whenever the hero changes, and commit the PNG.

## License & contact

TODO(owner): license.
TODO(owner): contact / support email.
