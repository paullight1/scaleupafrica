# Cresciva Backend/API Cutover Review

> **Phase:** 6 — Backend/API Production Cutover  
> **Branch:** `docs/cresciva-production-readiness`  
> **Repository status:** implemented/hardened  
> **Live cutover status:** deferred by operator; launch remains Supabase-first unless a domain is explicitly enabled later.

## Launch topology decision

Cresciva does **not** require a big-bang NestJS cutover to launch. The browser already has per-domain routing through `VITE_API_DOMAINS`; when a domain is absent it remains on the existing Supabase/Edge path.

| Domain | Default launch owner | Backend candidate | Rollback |
| --- | --- | --- | --- |
| directory | Supabase | NestJS read API | remove `directory` from `VITE_API_DOMAINS` and rebuild |
| profiles | Supabase | NestJS profile API | remove `profiles` and rebuild |
| subscriptions | Supabase/RPC | NestJS facade | remove `subscriptions` and rebuild |
| funding | Supabase DB/Edge | NestJS funding API | remove `funding` and rebuild |

No domain should be enabled merely because the Backend implementation exists. Enable only after representative parity and live health evidence.

## Repository-side hardening

- Backend remains part of root lint/typecheck/test/build contracts even when no API domain is enabled.
- `Backend/src/config/env.ts` validates required database/Supabase configuration and now rejects empty, wildcard, localhost or non-HTTPS production CORS origins.
- `Backend/src/health/health.controller.ts` is dependency-aware: database failure produces a non-ready 503 rather than returning an `ok` response with a false DB flag.
- Backend bootstrap no longer carries retired Paystack raw-body/header assumptions; payment fulfillment remains single-homed in Supabase Edge/Bachs.
- Browser cutover remains explicit through `VITE_API_DOMAINS`; absent flags preserve the direct Supabase path.
- Bearer-token API calls do not enable credentialed cross-origin cookies.

## Required live evidence when the operator enables a domain

Before enabling any domain in production, record:

1. Backend deployment identifier/base URL and region.
2. HTTPS/readiness response and database-ready behavior.
3. Production CORS allowlist.
4. Representative parity cases against the existing Supabase path.
5. Error rate and latency during the observation window.
6. The exact `VITE_API_DOMAINS` value and rollback owner.

A correctness, authorization or data-exposure mismatch requires immediate flag rollback.

## Current phase state

Repository-side cutover controls and fail-safe defaults: **IMPLEMENTED**.

Live Backend deployment/domain observation: **DEFERRED_EXTERNAL** by operator.

**PHASE 6 REPOSITORY GATE: COMPLETE — LIVE CUTOVER DEFERRED**
