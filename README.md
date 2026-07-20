# ScaleUp Africa

ScaleUp Africa is a Pan-African SME platform: a public, searchable directory where founders
publish one credible business profile, plus subscription-gated **funding intelligence** — AI-curated
grants, accelerators, and fellowships relevant to African SMEs. Browsing the directory is free and
open; the Funding Radar is available to members with an active subscription.

## Stack

- **Frontend:** Vite + React 18 + TypeScript, [shadcn/ui](https://ui.shadcn.com) (Radix + Tailwind CSS),
  React Router v6, TanStack Query, Framer Motion.
- **Backend (current):** [Supabase](https://supabase.com) — auth, Postgres with Row-Level Security,
  storage, and edge functions (Deno).
- **API server (in progress):** a NestJS + Drizzle service under `server/` is being introduced —
  see `docs/plans/07` for scope and migration status.
- **Testing:** Vitest + Testing Library (jsdom).

## Getting started

**Prerequisites:** Node.js 20+ (bun also supported).

```sh
# 1. Install dependencies
npm install          # or: bun install

# 2. Configure environment
cp .env.example .env # then fill in your Supabase project values

# 3. Start the dev server
npm run dev          # http://localhost:8080
```

## Scripts

| Script              | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start the Vite dev server on port 8080       |
| `npm run build`     | Production build to `dist/`                  |
| `npm run build:dev` | Build with development mode settings         |
| `npm run lint`      | Run ESLint                                   |
| `npm run preview`   | Preview the production build locally         |
| `npm test`          | Run the Vitest suite once                    |
| `npm run test:watch`| Run Vitest in watch mode                     |

Run a single test file with `npx vitest run <path/to/file.test.ts>`.

## Environment

Frontend variables (all prefixed `VITE_`, safe to expose to the client):

| Variable                        | Description                              |
| ------------------------------- | ---------------------------------------- |
| `VITE_SUPABASE_URL`             | Supabase project URL                     |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key            |
| `VITE_SUPABASE_PROJECT_ID`      | Supabase project ref/ID                  |

Edge-function secrets (set on the Supabase function, never in the client bundle): the
`aggregate-funding` function reads an AI-gateway API key from its environment to curate funding
opportunities. See `supabase/functions/aggregate-funding/`.

## Project structure

```
src/
  pages/                 route components (directory, funding, auth, dashboard, admin, marketing)
  components/
    ui/                  shadcn/ui primitives
    common/              shared app primitives (SEO, layouts, states, header/footer)
    landing/             marketing landing sections
  integrations/supabase/ Supabase client + generated types
  hooks/ lib/            auth, queries, helpers
supabase/
  migrations/            SQL schema + RLS policies
  functions/             Deno edge functions
scripts/                 branding asset sources + generation (og-banner, favicon)
docs/plans/              implementation plans
```

## Deploy

The app is a static SPA. Build and host the output on any static host:

```sh
npm run build            # outputs dist/
```

Host `dist/` on Vercel, Netlify, or Cloudflare Pages with an SPA fallback to `index.html` (so
client-side routes resolve). Apply database changes with `supabase db push`, and deploy edge
functions with `supabase functions deploy aggregate-funding`.

To regenerate branding assets (favicon set + social banner) from their SVG sources:

```sh
bash scripts/generate-assets.sh
```

## License & contact

TODO(owner): license.
TODO(owner): contact / support email.
