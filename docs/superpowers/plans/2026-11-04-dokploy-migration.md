# Cresciva migration to existing Dokploy server

User explicitly authorizes migration to their own free Dokploy server.

1. Isolate grant-feed changes from concurrent coupon/directory work. Package both SPAs in an Nginx container; retain existing Supabase auth/database/storage/Edge Functions and membership boundaries.
2. Register a separate Cresciva production app in the accessible Dokploy instance at 169.58.121.207. Use existing server capacity and a git-backed Dockerfile build. No new paid services.
3. Verify HTTPS on a free temporary DNS hostname before domain cutover; confirm public routes, /admin SPA routing, assets, health, and a real authenticated grant feed.
4. Configure canonical www.crescivacapital.com and apex host routing. DNS uses Squarespace; locate authorized DNS access or provide exact records once the new service is verified. Keep Vercel configuration available for rollback.
5. Record server/application identifiers, release commit, live URL, health and grant-feed checks, deployment/rollback commands. Clean up temporary credentials and test users.

Release note: Git tracks both legacy `shared/contracts/` and canonical `Shared/contracts/`. A macOS checkout can overlay them; the isolated tree restores canonical capitalized files from HEAD. The Docker context excludes obsolete lowercase `shared` and `server` directories. Linux server builds use the canonical workspace only.
