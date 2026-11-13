# Free recurring grant discovery

User authorizes autonomous implementation and deployment, without paid services.

Approach: reuse Cresciva's existing funding table and Explore surface. Edutu's bridge exists but the deployed integration has no configured secrets and its old Render endpoint is unavailable; avoid requiring that service. Fetch public RSS from Opportunity Desk, Opportunities for Africans and Terra Viva Grants directly. No AI, scraping proxy, API key, new hosting or subscription is required.

1. Test and implement a bounded RSS normalizer in `supabase/functions/_shared/grantDiscovery.ts`. Keep recent grant/business-funding listings relevant to Africa or worldwide. Require HTTPS links on the known publisher, deduplicate canonical URLs, strip markup, bound fields and omit unverifiable dates/status. Publish discoveries as unverified, unknown application status; never claim eligibility or open status.
2. Add `grant-discovery` Edge Function, protected by a dedicated scheduler secret or staff JWT. Run independent bounded fetches, persist new records idempotently without overwriting staff edits, archive only old automatically managed unverified discoveries, and record run/source counts and failures in service-only tables. Use existing Supabase project fqragjhmunphhdnmvpgs.
3. Create migration for service-only import receipts/runs and pg_cron/pg_net scheduling. Store scheduler secret in Vault; run every six hours within the existing Supabase resources. Limit each import to a handful of RSS pages. Keep public/member access rules unchanged.
4. Make the empty Open for you view lead to Explore when discoveries exist. Preserve primary verification gates.
5. Run focused regression tests, workspace suite/typechecks/build; deploy function and migration, trigger import, check member-visible published rows, idempotency, unauthorized access and scheduled job results. Save operational evidence.

Review focus: malformed XML/unsafe links; stale or unrelated listings; duplicates/staff edits; single-source failure; unverified discoveries never becoming Apply now.
