# ScaleUp Africa API (NestJS + Drizzle)

NestJS API in front of the existing Supabase Postgres (Plan 07). It verifies Supabase
JWTs, mirrors RLS rules in code, and owns server reads/writes for **profiles/directory,
subscriptions, funding** (absorbing the `aggregate-funding` edge function) plus the
**Paystack webhook** mount. Auth + storage stay on the Supabase client.

`supabase/migrations/*.sql` remains the ONLY DDL pipeline — Drizzle here is a
read/write mirror verified with `drizzle-kit pull` (drift check), never a migrator.

## Setup

```sh
cd server
npm install
cp .env.example .env   # fill DATABASE_URL (pooler), SUPABASE_URL, JWT secret/JWKS, AI + Paystack keys
npm run build          # tsc -> dist/
npm run typecheck      # tsc --noEmit
npm test               # vitest (guards, DTOs, pure logic — no live DB)
npm run start:dev      # ts-node-dev watch on :3001
npm run start:prod     # node dist/server/src/main.js
```

## Endpoints (`/api/v1`)

| Method & path | Auth | Notes |
|---|---|---|
| `GET /health` | public | `{ ok, db }` |
| `GET /profiles` | public | list/search/paginate (`q,country,sector,page,pageSize,sort`) |
| `GET /profiles/:slug` | public | full public profile (+view count); 404 if hidden |
| `GET /profiles/me` | user | own profile (404 = none yet) |
| `PUT /profiles/me` | user | upsert own (strict zod; slug/status/featured stripped) |
| `DELETE /profiles/me` | user | 204 |
| `GET /subscriptions/me` | user | `{ hasAccess, expiresAt, active }` |
| `POST /funding/search` | user + active sub | AI deep search w/ 7-day cache; 5/min |
| `GET /funding/latest` | user + active sub | most recent unexpired cache |
| `GET /funding/opportunities` | public | curated published feed |
| `POST /webhooks/paystack` | signature | HMAC-SHA512 raw-body verify; handler = Plan 06 stub |
| `GET /og/directory/:slug` | public | OG-injection HTML for crawlers (see og.controller.ts) |

## Manual smoke test

```sh
curl localhost:3001/api/v1/health
curl "localhost:3001/api/v1/profiles?q=fintech&country=Nigeria&page=1"
# authed (copy a real access_token from the browser Supabase session):
TOKEN=... ; curl -H "Authorization: Bearer $TOKEN" localhost:3001/api/v1/subscriptions/me
```

## Drift check

```sh
DATABASE_URL=... npm run db:pull   # introspect into drizzle/_introspect (git-ignored); diff vs src/db/schema.ts
```
