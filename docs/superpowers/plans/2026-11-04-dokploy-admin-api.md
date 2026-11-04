# Dedicated admin and API services on Top100 Dokploy

User explicitly confirms `console.top100afl.com` and asks to add admin/backend there. Proceed autonomously using the existing Cresciva project and production environment.

1. Add independent Docker images for AdminPanel (Nginx, /admin basename) and Backend (Node22 NestJS /api/v1, non-root runtime and DB-backed health check). Keep existing Supabase services and free grant cron.
2. Provision a dedicated Postgres LOGIN for the API rather than reset/reuse the project's postgres password. Use a migration with narrowly scoped table grants and role-specific RLS policies matching the existing backend's verified-JWT trust boundary. Generate its password out of source control. No auth schema, service-role membership, DDL or billing write access.
3. Deploy two named Dokploy applications, `Cresciva admin` and `Cresciva API`, from the existing deployment branch. Configure backend DATABASE_URL, SUPABASE_URL and exact CORS allowlist server-side. Leave paid AI credentials unset.
4. Add more specific Traefik path routes /admin and /api to the existing Cresciva hostnames so admin shares the public site's authenticated session and API can be reached on the same origin. Add temporary dedicated service hostnames for diagnostics. Do not switch optional frontend API domain flags in this deployment.
5. Verify both containers healthy, SPA assets/deep routes, backend database health, public directory read, invalid JWT rejection, authenticated subscription/profile/funding reads, paid funding gate, and anonymous/admin access controls. Remove temporary test users and deployment credentials. Record service IDs/URLs and operating instructions.
