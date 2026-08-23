# Cresciva Production-Readiness Evidence

This directory records release evidence and operator handoff state. It must not contain secrets, raw payment credentials, full private provider payloads or unnecessary PII.

## Evidence map

| Area | Evidence |
| --- | --- |
| Environment/topology | `environment-inventory.md` |
| Payments/Bachs | `payment-certification.md` |
| Supabase/RLS/data integrity | `supabase-security-review.md` |
| Funding provenance | `funding-provenance-review.md` |
| Funding Intelligence certification | `funding-intelligence-certification.md` |
| Backend/API cutover | `backend-cutover.md` |
| Web/SEO/performance budgets | `web-quality-report.md` |
| Observability/alerts | `observability-alerts.md` |
| Legal/privacy/support/data rights | `legal-support-readiness.md` |
| Backup/restore | `restore-runbook.md` |
| Final launch decision | `launch-decision.md` |

## Status meaning

- **Repository complete** — required source/config/tests/runbooks have been implemented on the production-readiness branch.
- **Deferred external** — requires a live provider/project/browser/legal/operator action that is intentionally not proven from source alone.
- **GO** — only valid for a specific deployed release after the live checklist in `launch-decision.md` is evidenced.

The operator chose to skip hosted CI/Vercel rate-limit waits during implementation and will deploy/validate the live environment independently. Missing hosted checks must therefore be replaced by equivalent clean-checkout/live evidence before the final decision changes from NO-GO to GO.

## Primary commands

```bash
npm ci
npm run verify
```

Funding Intelligence releases should also run the dedicated funding certification/evaluation workflows/commands against the intended release corpus.

See `../00-MASTER-LAUNCH-ROADMAP.md` and `../../operations/RELEASE.md` for the complete release sequence.
