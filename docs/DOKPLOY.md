# Cresciva on Dokploy

Cresciva now has separate public-web, admin and NestJS API applications on the owner's existing server. Supabase remains responsible for auth, database, storage, payments/webhooks and scheduled free grant discovery. The API is deployed behind `/api/v1`; existing frontend domain-routing flags remain unchanged. See [DOKPLOY_SERVICES.md](DOKPLOY_SERVICES.md) for the dedicated services and verification.

## Production service

| Setting | Value |
|---|---|
| Server | `169.58.121.207` |
| Management console | `https://console.top100afl.com` |
| Dokploy project | Cresciva, `UYSFztIqa57EyENxlt_GM` |
| Environment | production, `2fzepjNW988xaG0QNwzKK` |
| Application | Cresciva web, `oSXR15kbAwQhI2e_PktZ6` |
| Swarm service | `app-bypass-haptic-application-iz2w8c` |
| Source | `https://github.com/paullight1/scaleupafrica.git` |
| Deployment branch | `codex/free-grants-dokploy` |
| First release | `11fcc9e` |
| Verified Nginx header release | `0683865` |
| Build | Dockerfile, repository root context `.` |
| Container port | `80` |
| Temporary HTTPS origin | `https://cresciva.169.58.121.207.sslip.io` |
| Canonical domain | `https://www.crescivacapital.com` |
| Health check | `/healthz` → `200 ok` |

The branch isolates the grant and migration work from concurrently edited coupon/directory features. Merge/repoint the deployment branch deliberately when those changes are ready; this server does not consume unstaged files from another checkout.

## Squarespace DNS cutover — completed 6 November 2026

The user updated DNS. Both apex and www now resolve to `169.58.121.207`:

| Type | Host | Target |
|---|---|---|
| A | `@` | `169.58.121.207` |
| CNAME | `www` | `crescivacapital.com` |

Keep email MX/TXT records and unrelated subdomains intact. Both apex and www routes have valid Let's Encrypt certificates and return 200 from `/healthz`.

The initial certificate challenges ran while DNS still pointed at Vercel. After confirming public and server DNS had propagated, temporarily renaming only the two Cresciva web TLS routers triggered a configuration reload and successful issuance. The original router configuration was then restored. No proxy restart or application redeployment was needed. The canonical homepage renders in a real browser; `/admin/` and `/api/v1/health` return 200 over verified HTTPS. Email/OAuth redirect flows were not retested during this cutover.

## Build and routing

The public Node22 build installs locked npm workspaces and runs `npm run build`; its assembled admin artifact remains available as a fallback. More-specific Dokploy routes now send `/admin` to the dedicated admin container and `/api/v1` to the dedicated API container. Frontend Supabase configuration is publishable; no service-role, scraper secret or payment secret is sent to the runtime or browser.

Nginx serves:

- public React routes using `/index.html` fallback;
- `/admin/*` using `/admin/index.html` fallback;
- hashed `/assets/*` and `/admin/assets/*` with immutable year-long caching and real 404s for missing assets;
- `/healthz` as a lightweight process health check.

Git contains both legacy lowercase `shared/contracts/` and canonical `Shared/contracts/`. On a case-insensitive macOS checkout, restore the canonical files from Git before testing. Docker ignores legacy lowercase `shared`/`server`; the Linux server builds the canonical uppercase workspaces.

## Redeployment and rollback

Use **Cresciva → production → Cresciva web → Deploy** in Dokploy after pushing reviewed changes to the deployment branch. Deployment logs live under `/etc/dokploy/logs/app-bypass-haptic-application-iz2w8c/` on the server. Only deploy this application; the server also hosts other products.

To roll back a subsequent release, select a prior successful Cresciva deployment in Dokploy or revert the release on the configured branch and deploy again. Vercel resources were retained; DNS could be reverted to the recorded original hosting records, but that host currently returns `DEPLOYMENT_DISABLED` and requires its owner to restore it first.

No persistent deployment API key is committed or retained. The temporary server-side automation key and browser test member are removed after verification.

## Verified 4 November 2026

- Dokploy deployment status `done`; runtime container healthy.
- Valid HTTPS on the temporary hostname.
- `/`, `/directory`, `/dashboard/funding`, `/auth`, `/admin/`, `/admin/funding`, public/admin assets and `/healthz` returned HTTP 200.
- `nginx -t` passed inside the deployed container. SPA/admin/asset responses retain `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` alongside their cache policy.
- Real Supabase member password sign-in succeeded on Dokploy; Explore displayed 15 opportunities and the British Council grant with **Unverified**, **Current status unconfirmed** and **View source listing**.
- Grant parser/card/workspace regressions: 36 passed. Workspace typechecks and both web builds passed. Earlier full workspace tests exposed pre-existing landing/design/admin failures; the full suite is not claimed clean.
- Other existing Dokploy services remained at 1/1 replicas.
- Canonical DNS and HTTPS were subsequently verified complete on 6 November 2026, as described above.
