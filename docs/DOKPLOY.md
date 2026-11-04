# Cresciva on Dokploy

Cresciva's public website and admin panel are deployed as one static Nginx application on the owner's existing server. Supabase remains responsible for auth, database, storage, payments/webhooks and scheduled free grant discovery. The optional NestJS API remains off under the existing frontend flags.

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
| Build | Dockerfile, repository root context `.` |
| Container port | `80` |
| Temporary HTTPS origin | `https://cresciva.169.58.121.207.sslip.io` |
| Canonical domain | `https://www.crescivacapital.com` |
| Health check | `/healthz` → `200 ok` |

The branch isolates the grant and migration work from concurrently edited coupon/directory features. Merge/repoint the deployment branch deliberately when those changes are ready; this server does not consume unstaged files from another checkout.

## Squarespace DNS cutover — user-owned step

The user requested these records and will update DNS:

| Type | Host | Target |
|---|---|---|
| A | `@` | `169.58.121.207` |
| CNAME | `www` | `crescivacapital.com` |

Replace old Vercel records for these two web hostnames; remove old AAAA records for them if present. Retain email MX/TXT records and unrelated subdomains. Both apex and www routes are registered in Dokploy with Let's Encrypt HTTPS. After DNS propagates, verify that their certificates are issued and `/healthz` returns 200. If needed, save the domain configuration in Dokploy again to trigger certificate reconciliation.

Until this manual step finishes, use the temporary HTTPS origin for inspection. The build keeps the canonical production origin, so email/OAuth redirects and share URLs still target the main domain; only ordinary password sign-in was tested on the temporary host.

## Build and routing

The Node 22 build installs the locked npm workspaces and runs `npm run build`; `assemble` includes the admin artifact under `/admin/`. The runtime image contains only static output and Nginx. Frontend Supabase configuration is publishable; no service-role, scraper secret or payment secret is sent to the runtime or browser.

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
- `nginx -t` passed inside the deployed container.
- Real Supabase member password sign-in succeeded on Dokploy; Explore displayed 15 opportunities and the British Council grant with **Unverified**, **Current status unconfirmed** and **View source listing**.
- Grant parser/card/workspace regressions: 36 passed. Workspace typechecks and both web builds passed. Earlier full workspace tests exposed pre-existing landing/design/admin failures; the full suite is not claimed clean.
- Other existing Dokploy services remained at 1/1 replicas.
- Canonical DNS update remains delegated to the user and is not claimed complete here.
