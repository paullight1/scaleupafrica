# Dedicated Cresciva services

The user explicitly confirmed `console.top100afl.com` as the intended console and requested admin/backend services there. All three applications are in **Cresciva → production**, on existing server `169.58.121.207`.

| Application | Dokploy ID | Swarm service | Build | Port |
|---|---|---|---|---|
| Cresciva web | `oSXR15kbAwQhI2e_PktZ6` | `app-bypass-haptic-application-iz2w8c` | `Dockerfile` | 80 |
| Cresciva admin | `vraMK32zfqRYsVT5CvdtH` | `app-generate-cross-platform-bus-z5n45n` | `Dockerfile.admin` | 80 |
| Cresciva API | `wUMjbkTc4A5LT9G20r8iP` | `app-transmit-online-monitor-j9yx8b` | `Dockerfile.api` | 3001 |

Source is `paullight1/scaleupafrica`, branch `codex/free-grants-dokploy`, root Docker build context. API release `41b511d`; final admin redirect/navigation release `db39e1b`.

## URLs and routing

- Web: https://cresciva.169.58.121.207.sslip.io/
- Admin through the public origin: https://cresciva.169.58.121.207.sslip.io/admin/
- Standalone admin: https://cresciva-admin.169.58.121.207.sslip.io/admin/
- API through the public origin: https://cresciva.169.58.121.207.sslip.io/api/v1/health
- Direct API health: https://cresciva-api.169.58.121.207.sslip.io/api/v1/health
- Direct admin process health: https://cresciva-admin.169.58.121.207.sslip.io/healthz

Dokploy/Traefik routes `/admin` to the admin container and `/api/v1` to the API, preserving the path. The same rules are registered on `www.crescivacapital.com` and `crescivacapital.com`. The main-domain DNS update still belongs to the user; the existing A/CNAME instructions in [DOKPLOY.md](DOKPLOY.md) are valid for this confirmed server. No additional DNS record is required for these path routes.

Admin uses its own staff sign-in and corporate-email/database-role checks. `VITE_SITE_URL` follows `VITE_SITE_ORIGIN` for View site/sign-out navigation; production canonical links still target `https://www.crescivacapital.com`. Nginx emits relative redirects to preserve HTTPS behind Traefik. A staff session on the same public origin can also be used through `/admin`; independent hostnames maintain separate browser storage.

## Backend runtime

Only server-side Dokploy environment contains:

- `NODE_ENV=production`, `PORT=3001`;
- `DATABASE_URL` for the private `cresciva_backend` login, using the existing Supabase IPv4 transaction pooler with TLS;
- `SUPABASE_URL=https://fqragjhmunphhdnmvpgs.supabase.co`;
- explicit HTTPS `CORS_ORIGINS` for Cresciva's canonical and temporary web/admin origins.

JWTs are verified with the existing project's ES256 JWKS. No service-role key, payment key or paid AI key is required by the mounted API modules. No database password, runtime env file or deployment token is committed. The container runs as the unprivileged Node user; its health check verifies the database through `/api/v1/health`.

The existing frontend API-domain cutover flags remain unchanged. This deployment exposes a tested API and same-origin route without changing all client data access. Auth, storage, existing payment/email Edge Functions and free six-hour grant discovery continue on the current Supabase project. Shared/ is a build dependency, not a standalone server process.

## Database access boundary

Migration `20261104173903_cresciva_backend_runtime_role.sql` provisions a private role with:

- profiles and per-user funding-results cache: SELECT/INSERT/UPDATE/DELETE;
- subscriptions, user_roles and curated funding: SELECT only;
- no superuser/createdb/createrole/replication/BYPASSRLS privileges;
- no postgres/service_role membership or auth.users SELECT;
- ten-connection limit and bounded statement/lock timeouts.

Role-specific policies allow these private server queries across rows; the API's verified-JWT ownership filters remain the per-user trust boundary, as in the existing backend architecture. Public/browser roles do not inherit this login. Live tests verified another user's query/header/body cannot change the API's authenticated owner. The old postgres password was not reset.

For rotation, generate a new password privately, update this dedicated login and Dokploy's backend DATABASE_URL together, redeploy only Cresciva API, and verify health/owner checks. Never place this URL in a VITE_ variable. The temporary provisioning files, test users and deployment API key are removed after verification.

## Verification, 4 November 2026

- All three application deployments `done`; all three containers healthy, one replica each.
- Backend unit tests: 122 passed; typecheck, build and ESLint passed.
- The missing Nest ValidationPipe runtime dependencies were caught by a failing startup regression and fixed with pinned class-validator/class-transformer dependencies.
- Dedicated DB login connected from the VPS and read the 15 published opportunities.
- Database role regression passed, including denied subscription writes, privileged-role membership and auth-table access.
- Supabase security advisor introduced no new findings.
- DB-backed API health and public directory reads returned 200.
- Anonymous funding / invalid JWT returned 401; real member subscription and 15-item funding feed returned 200.
- Nonmember funding returned 403 despite forged user-ID query/header; profile reads ignored another user's supplied ID.
- Profile PUT rejected a forged owner field with 400; valid own-profile update returned 200 and left the other test profile unchanged.
- Exact CORS allowlist was enforced.
- Corporate staff browser sign-in succeeded on the standalone admin service. Editor access was denied on admin-only funding; a temporary administrator loaded all 15 real funding records.
- Public-origin and standalone admin deep routes/assets returned 200; nginx configuration test passed; root redirect was relative `/admin/`.

Inspect `artifacts/dokploy-services-live-evidence.json` for the concise check record. Deploy and roll back each application independently in the console; do not redeploy other projects on this shared server.
