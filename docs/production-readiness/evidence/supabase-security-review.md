# Cresciva Supabase Security & Data Integrity Review

> **Phase:** 4 — Supabase Security, Data Integrity & Recovery  
> **Repository branch:** `docs/cresciva-production-readiness`  
> **Status:** `BLOCKED_EXTERNAL` until the real Cresciva Supabase project is inspected and the authorization/restore tests are executed there.  
> **Do not record secrets, raw payment payloads, or user PII in this file.**

## 1. Repository-side controls now present

The repository contains a repeatable authorization matrix at:

`supabase/tests/authorization-matrix.sql`

It is CI-guarded by:

`Backend/test/supabase-authorization-matrix.spec.ts`

The matrix is designed to run only against an isolated database after the full migration chain is applied. It checks:

- RLS enabled on exposed Cresciva tables when present;
- no browser-role direct mutation of payment, entitlement, role, notification, source-registry and status-audit ledgers;
- anonymous users cannot select raw `profiles.email`, `profiles.phone`, or `profiles.whatsapp` columns directly;
- owner-scoped profile/subscription/payment policies include `auth.uid()` boundaries;
- every public `SECURITY DEFINER` routine pins `search_path`;
- service-only functions are not executable by `anon` or `authenticated`;
- browser-callable privileged RPCs contain explicit caller authorization logic;
- profile-media storage policies bind access to the authenticated UID path.

Funding Intelligence P0 also adds explicit `REVOKE`/`GRANT` treatment for service-only enrichment, funding-status and notification routines, with staff mutations routed through authorized RPCs rather than direct browser writes.

## 2. Authorization matrix

| Data/operation | anon | authenticated owner | authenticated other user | staff/admin | service_role |
| --- | --- | --- | --- | --- | --- |
| public business profile safe fields | read published | read | read | read | full |
| raw contact fields | no bulk/direct read | controlled own/edit or reveal path | no | operational only | full |
| subscriptions | no | read own | no | support path only | full |
| payments | no | read own | no | read-only reconciliation/support | full |
| payment webhook events | no | no | no | sanitized operational evidence only | full |
| user roles | no | no direct write | no direct write | authorized role RPC only | full |
| funding sources/status checks | no direct write | no direct write | no direct write | authorized staff RPCs | full |
| business enrichment confirmation | no | through server-mediated member confirmation flow | no | operational review | full |
| notification queue/delivery leases | no | no | no | operational visibility only | full |
| profile-media object write/delete | no | own UID path only | no | no implicit cross-user access | full |

## 3. SECURITY DEFINER audit contract

Every `SECURITY DEFINER` routine in `public` must satisfy both:

1. pinned `search_path`;
2. one of:
   - service-only EXECUTE grants; or
   - explicit authenticated authorization inside the routine plus restricted grants.

High-risk functions requiring explicit verification include:

- `grant_annual_access`
- `admin_set_role`
- `confirm_business_identity`
- `record_funding_status_check`
- `update_funding_source_and_invalidate`
- `enqueue_funding_transition_notifications`
- `claim_funding_notification_events`
- `get_profile_contact`
- `has_active_subscription`
- `directory_facets`
- `increment_profile_views`

## 4. Storage lifecycle

`Frontend/src/components/ImageUploadCrop.tsx` returns the previous storage path to the parent when an image is replaced or removed, allowing save flows to delete superseded objects rather than accumulating unbounded orphan media.

Repository review still requires the profile-save integration tests to prove the parent performs that cleanup. Live bucket policies must separately enforce MIME/size/path restrictions; client-side file checks are UX only.

## 5. Retention classes

| Data class | Intended lifecycle |
| --- | --- |
| account/profile data | delete or anonymize when account deletion completes, except legally required records |
| public directory data | unpublished immediately on account/profile deletion; retained only when required by another legal/operational basis |
| contact data | remove with profile/account unless explicitly retained by a lawful operational requirement |
| payment/accounting records | retain minimum accounting/audit fields for the required retention period; avoid retaining unnecessary profile/contact data |
| funding searches/cache | member-owned operational data; delete/anonymize with account unless needed for aggregate non-identifying metrics |
| saved/member opportunity states | delete with account |
| email/newsletter preferences | retain suppression/unsubscribe state as needed to honor consent choices; delete unrelated content |
| admin/audit records | retain minimum evidence necessary for security/financial operations with access restrictions |
| uploaded media | delete owned objects during successful deletion unless explicitly retained for legal reasons |

Phase 9 owns customer-facing policy wording and request UX. Phase 4 owns database-safe behavior and evidence.

## 6. Live checks still required

The connected Supabase scope available during repository work does **not** expose the Cresciva project declared by this repository. Therefore the following items are not yet evidenced and must not be reported as passed:

- current production migration history;
- current live generated TypeScript types;
- security advisor results;
- performance advisor results;
- actual production RLS/policy state;
- actual storage bucket policies/limits;
- backup retention/PITR entitlement;
- restore rehearsal;
- production query plans.

When access is available, execute:

1. apply/replay migrations in an isolated branch/project;
2. run `supabase/tests/authorization-matrix.sql` against that isolated target;
3. run security and performance advisors and record before/after findings;
4. generate current TypeScript types and diff them against repository types;
5. inspect representative query plans on non-sensitive data;
6. perform the restore rehearsal defined in `restore-runbook.md`.

## 7. Phase 4 gate

Repository-side security proof infrastructure: **IMPLEMENTED**.

Live database/advisor/recovery proof: **NOT YET EXECUTED**.

**PHASE 4 RELEASE GATE: BLOCKED_EXTERNAL**
