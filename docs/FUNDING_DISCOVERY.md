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

The user updated Squarespace DNS. On 6 November 2026, both canonical hostnames resolved to the Dokploy server, valid Let's Encrypt certificates were issued, and the canonical website, admin and DB-backed API health returned 200. The canonical homepage was also verified in a real browser.

## Follow-up verification, 6 November 2026

- 17 published automatic imports, including eight grants.
- Latest scheduled run succeeded at 06:17 UTC / 07:17 Lagos; all six source pages succeeded.
- The preceding evening run automatically inserted two new opportunities, confirming ingestion continues without manual intervention.
- Six-hour cron remains active. No paid scraper, extraction API or new hosting subscription was added.
- Public, admin and API containers remain healthy with one replica each.

See [DOKPLOY.md](DOKPLOY.md) for service IDs, DNS records, health checks, deployment and rollback. No new hosting subscription was purchased.

## Official review and global research, 6 November 2026

Reviewed all eight imported grant records against official sources. One UNESCO duplicate was archived and the Equality Fund record was corrected to a fellowship. HCLTech and Keeling Curve were also checked. Seven additional global opportunities were added, without duplicating the existing Global EbA Fund call.

The resulting feed has 23 published opportunities, including 13 grants. Sixteen records have registered official sources, application links and source-check audit entries; fifteen are open/closing soon/rolling, and the undated AECF window remains unknown. Date-only deadlines retain their published text without invented timestamps. Equality Fund's conflicting closing times and Pollination Project's conflicting award caps are explicit in the notes. FBIS uses a downloadable form and email submission, described in the record; no applications or emails were sent.

Evidence is in `artifacts/funding-verification/2026-11-06-*.json`. The card now displays confirmed source deadline text, including published timezones or time conflicts. Focused card/workspace/recommendation tests: 47 passed; frontend build, typecheck and changed-file lint passed. Public deployment `7b33b9c` completed and its container is healthy.

This is a dated source review, not a new continuous verification service. Existing freshness limits still downgrade application status to unknown when checks expire. Six-hour RSS discovery continues; global web research was performed for this review without a paid search API. Source/application portal access limitations are recorded in the evidence files.

## Continuous discovery and official checks, 6 November 2026

Three complementary schedules are active:

- Six-hour RSS discovery: nine fixed pages from six publishers (the original three plus FundsforNGOs, Adaptation Fund and IDRC). The first expanded scheduled-path run succeeded on all nine pages, found 26 candidates and inserted 12 new listings. New publisher discoveries remain unverified until authoritative evidence supports promotion.
- Hourly official-source maintenance: `cresciva-free-official-grant-checks`, at minute 23. `free-grant-maintenance` checks up to eight oldest registered records per run, four concurrently, using bounded public fetches and the pure `freeGrantVerification.ts` parser. It uses no model or paid API. Official redirects must remain inside the matched registered source scope. Empty/challenge/ambiguous pages cannot renew verification. An application portal fetch must succeed before an actionable status is stored. Failed checks retain the known application link and deadline history but downgrade current application/deadline certainty. Explicit rolling intake and source-backed date-only deadlines are supported; unlabelled numeric dates and conflicting deadlines fail closed.
- Daily global web research at 07:30 Lagos: Codex automation `find-and-verify-global-grants` searches beyond RSS, verifies official funder/application pages, admits independently checked new funders and updates dated research evidence. It must not buy services, invoke paid data/search/extraction APIs, send applications or alter roles/payments. This app automation uses the existing Codex allowance and needs the app/machine available. It is not an unlimited free web-search API. RSS and hourly platform checks run independently in Supabase.

No new hosting subscription, paid scraper or extraction/search API was provisioned. Existing Supabase quotas and Codex usage limits still apply; unavailable paid/entitlement-gated research must fail rather than spend. This pipeline does not call the older paid `funding-source-refresh` extractor.

The service-only `apply_free_grant_check` RPC locks the record and compares its `updated_at` timestamp before applying the canonical check and audit entry together. Concurrent staff edits and archived records are protected. Source content changes revoke old structured eligibility rules rather than silently extending them. `details.free_verification` holds bounded check health/fingerprint metadata; `details.last_known_deadline` preserves prior supported deadline evidence after an uncertain check. The due-list RPC shares the existing registered-source path scope. Public/browser roles cannot invoke either maintenance RPC.

Migration: `20261106103200_free_grant_maintenance.sql`. The new worker authenticates with the existing Vault/Edge `GRANT_DISCOVERY_SECRET`; no secret is copied to Git or browser variables. Regression checks are in `supabase/tests/free_grant_maintenance.sql`; tests roll back their fixtures. To stop maintenance, deactivate only its named cron job. Disable the daily research separately in Codex Automations.

Known first-party discoveries from IDRC and Adaptation Fund now enter the hourly queue automatically through `queue_official_feed_discoveries`, deployed in migration `20261106111040_queue_official_feed_discoveries.sql`. The function admits only untouched automatic listings from the exact known feed and host, and does not mark them verified/open. Other new funders need the daily official-source admission step. Application links that are blocked, missing or ambiguous remain unconfirmed.

Final verification: 36 focused parser/discovery/network-boundary tests passed; frontend typecheck passed. Both SQL regression transactions passed, including public execution denial, concurrent-edit protection, registered child paths, failed-check deadline history, changed-source eligibility invalidation and first-party host/editorial boundaries. The real Vault/pg_net path returned HTTP 200 for rotating eight-record batches; all 18 currently registered records have maintenance metadata, including two first-party discoveries. Both database cron jobs and the daily app automation are active. Security advisor findings are unchanged from before these migrations. Visible-text fingerprints ignore script/tracking churn when detecting changes to eligibility evidence. Large scripts, truncated bodies, future opening dates, dotted GMT times and ambiguous midnight boundaries are covered by tests.
