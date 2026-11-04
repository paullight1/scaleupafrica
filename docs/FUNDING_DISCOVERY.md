# Free automatic funding discovery

Cresciva now imports public RSS listings directly into the existing member Funding Radar. It uses no paid scraper, AI extraction, new hosting service or provider API key.

## Where members see listings

Members with a business profile can use **Funding → Explore**. The empty Open for you screen also offers an Explore button when records are available. Records retain publisher links in `url` (not the authoritative `source_url` field) and are explicitly unverified, with unknown application status. They cannot enter Apply now without the existing authoritative verification and eligibility checks. Publisher links are labelled **View source listing**.

The public site's usual membership gates remain in force. “Free” here means the ingestion does not purchase services; it does not change Cresciva's membership pricing.

## Sources and limits

- Opportunity Desk: Grants RSS, first two pages.
- Opportunities for Africans: RSS, first two pages.
- Terra Viva Grants: RSS, first two pages.

The importer accepts recent items (45 days), checks funding relevance and Africa/worldwide relevance, excludes obvious employment/scholarship/roundup/advice articles, and requires HTTPS links to the expected publisher. Each request has an 18-second timeout and a 2 MB cap; at most 50 items per page are examined. Sources fail independently. Metadata stays bounded and article bodies are not republished.

URL tracking parameters are removed. Stable IDs and transactional insert-only writes prevent duplicate imports and preserve staff edits and archived records. Different publishers may cover the same program; those listings remain separate until editorial verification establishes a shared official source. Unedited automatic records expire after 60 days. A publisher's own listing is evidence of discovery, not evidence that applications remain open.

## Production setup

Project: `fqragjhmunphhdnmvpgs`.

- Edge Function: `grant-discovery` (deployed).
- SQL migrations: `20261104064435_free_grant_discovery.sql` and `20261104151540_keep_grant_listings_out_of_verification_queue.sql` (applied and recorded).
- Cron job: `cresciva-free-grant-discovery`, schedule `17 */6 * * *` UTC (01:17, 07:17, 13:17 and 19:17 Lagos).
- Edge secret: `GRANT_DISCOVERY_SECRET`.
- Vault secret: `grant_discovery_secret`, with the same random value.
- Run log: `public.grant_discovery_runs` (service-only).
- Transactional importer: `public.import_grant_discoveries(jsonb)` (service-only, security invoker).

No service-role key or scheduler secret belongs in frontend environment variables, source control or cron SQL literals. To rotate, update both the Edge secret and Vault entry. Edutu remains an optional independent bridge; this feed does not require its availability or API key.

## Operations

Using an authenticated Supabase CLI from this repo:

```sh
npx supabase db query --remote --read-only "select started_at, finished_at, status, imported_count, discovered_count, sources from public.grant_discovery_runs order by started_at desc limit 10"
npx supabase db query --remote --read-only "select jobid, jobname, schedule, active from cron.job where jobname = 'cresciva-free-grant-discovery'"
```

A partial run means at least one publisher failed; inspect `sources` for bounded error codes. A failed run means no source succeeded or persistence failed. Alert/investigate repeated failed runs. Existing listings are not marked fresh or verified when a source fails.

To run the exact scheduler command immediately without disclosing its Vault secret:

```sql
DO $$
DECLARE command_text text;
BEGIN
  SELECT command INTO command_text FROM cron.job
  WHERE jobname = 'cresciva-free-grant-discovery';
  EXECUTE command_text;
END $$;
```

The function also accepts a Supabase staff JWT for an explicit HTTP POST. It does not accept public publishable keys as import authorization. Database invariants can be tested with `supabase/tests/free_grant_discovery.sql`; the fixture transaction rolls back.

## Verified on 4 November 2026

- Initial production run: 14 published discoveries, including seven grants; all six feed pages succeeded.
- Repeat run: zero new rows, 14 discoveries; no duplicates. A later scheduled-path run discovered one new listing automatically, bringing the total to 15 (seven grants).
- Scheduler command through pg_net and Vault: HTTP 200, no timeout.
- Missing/incorrect scheduler secret: HTTP 401.
- SQL regression checks: repeated imports, preserved staff edits/draft state, unverified/unknown trust status and service-only grants passed.
- Member browser check: built frontend against the real Supabase project displayed Explore 14, real UNESCO listings, Unverified / Current status unconfirmed badges and View source listing links. Temporary test account, membership and profile were removed.
- Changed frontend files pass ESLint; frontend and admin production builds succeed. Focused funding tests pass. The broad workspace run also exposed existing/concurrently edited coupon, landing-page, design-scan and admin-finance failures; it was not a clean whole-repository pass.
- Security advisor results before/after the schema change are identical; the new function/table introduce no additional findings.

## Dokploy migration

The public and admin apps are now deployed on the existing Dokploy VPS at `169.58.121.207`. The live temporary origin is [cresciva.169.58.121.207.sslip.io](https://cresciva.169.58.121.207.sslip.io). A real member sign-in and Explore 15 were verified there over HTTPS. The separate Cresciva application retains the same Supabase project and six-hour import schedule.

The user chose to update Squarespace DNS themselves. The original canonical domain still points to disabled Vercel hosting until that change propagates. Both canonical domain routes have already been configured in Dokploy.

See [DOKPLOY.md](DOKPLOY.md) for service IDs, DNS records, health checks, deployment and rollback. No new hosting subscription was purchased.
