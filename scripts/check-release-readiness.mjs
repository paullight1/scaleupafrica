import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const required = [
  "docs/operations/PAYMENT_SUPPORT.md",
  "docs/operations/FUNDING_CORRECTIONS.md",
  "docs/operations/SUPPORT.md",
  "docs/operations/RELEASE.md",
  "docs/operations/INCIDENT_RESPONSE.md",
  "docs/production-readiness/evidence/backend-cutover.md",
  "docs/production-readiness/evidence/web-quality-report.md",
  "docs/production-readiness/evidence/observability-alerts.md",
  "docs/production-readiness/evidence/legal-support-readiness.md",
  "docs/production-readiness/evidence/supabase-security-review.md",
  "docs/production-readiness/evidence/funding-intelligence-certification.md",
  "docs/production-readiness/evidence/launch-decision.md",
  "supabase/migrations/20260823093000_account_data_rights.sql",
  "supabase/migrations/20260823094500_funding_corrections.sql",
  "supabase/migrations/20260823095500_bachs_provider_defaults.sql",
  "supabase/functions/account-data/index.ts",
  "Frontend/src/components/dashboard/DataRightsCard.tsx",
  "Frontend/src/components/funding/FundingIssueReport.tsx",
  "AdminPanel/src/pages/AdminFundingReports.tsx",
  "Backend/src/db/payment-schema.ts",
  "Backend/src/observability/logger.ts",
  "supabase/functions/_shared/log.ts",
];

async function text(file) {
  return fs.readFile(path.join(ROOT, file), "utf8");
}

const failures = [];
for (const file of required) {
  try { await fs.access(path.join(ROOT, file)); }
  catch { failures.push(`missing required release artifact: ${file}`); }
}

const [
  pkg,
  config,
  terms,
  privacy,
  backendEnv,
  health,
  accountData,
  fundingWorkspace,
  accountRightsMigration,
  fundingReportsMigration,
  providerDefaultsMigration,
  paymentSchema,
  dbClient,
] = await Promise.all([
  text("package.json"),
  text("supabase/config.toml"),
  text("Frontend/src/pages/Terms.tsx"),
  text("Frontend/src/pages/Privacy.tsx"),
  text("Backend/src/config/env.ts"),
  text("Backend/src/health/health.controller.ts"),
  text("supabase/functions/account-data/index.ts"),
  text("Frontend/src/components/funding/FundingWorkspace.tsx"),
  text("supabase/migrations/20260823093000_account_data_rights.sql"),
  text("supabase/migrations/20260823094500_funding_corrections.sql"),
  text("supabase/migrations/20260823095500_bachs_provider_defaults.sql"),
  text("Backend/src/db/payment-schema.ts"),
  text("Backend/src/db/client.ts"),
]);

function requireContains(label, source, needle) {
  if (!source.includes(needle)) failures.push(`${label} missing ${needle}`);
}
function requireAbsent(label, source, pattern) {
  if (pattern.test(source)) failures.push(`${label} contains forbidden ${pattern}`);
}
function requireOrder(label, source, first, second) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex >= secondIndex) failures.push(`${label} must contain ${first} before ${second}`);
}

requireContains("package.json", pkg, '"node": ">=22"');
requireContains("package.json", pkg, '"verify:web-quality"');
requireContains("package.json", pkg, '"verify:release"');

requireContains("supabase/config.toml", config, "[functions.bachs-webhook]");
requireContains("supabase/config.toml", config, "[functions.account-data]");
requireContains("supabase/config.toml", config, "[functions.funding-source-refresh]");
requireContains("supabase/config.toml", config, "[functions.funding-notifications]");
requireAbsent("supabase/config.toml", config, /functions\.paystack-/i);

requireContains("Terms", terms, "Bachs");
requireContains("Terms", terms, "does not auto-renew");
requireAbsent("Terms", terms, /Paystack/i);
requireContains("Privacy", privacy, "Bachs");
requireContains("Privacy", privacy, "Account settings provide a portable data export");
requireContains("Privacy", privacy, "minimal detached payment");
requireAbsent("Privacy", privacy, /Paystack/i);

requireContains("Backend env", backendEnv, "production origins must be explicit non-local HTTPS origins");
requireContains("Backend health", health, "ServiceUnavailableException");

requireContains("Account deletion", accountData, "DELETE MY ACCOUNT");
requireContains("Account deletion", accountData, "removeProfileMedia");
requireContains("Account deletion", accountData, "auth.admin.deleteUser");
requireAbsent("Account deletion", accountData, /prepare_account_deletion/);
requireOrder("Account deletion", accountData, "await removeProfileMedia(service, user.id)", "auth.admin.deleteUser(user.id)");
requireContains("Account export", accountData, 'selectRows(service, "profiles", "user_id", user.id)');
requireContains("Account export", accountData, "business_enrichment_candidates");
requireContains("Account export", accountData, "funding_correction_reports");

requireContains("Account-rights migration", accountRightsMigration, "ON DELETE SET NULL");
requireContains("Account-rights migration", accountRightsMigration, "sanitize_account_before_auth_delete");
requireContains("Account-rights migration", accountRightsMigration, "BEFORE DELETE ON auth.users");
requireContains("Account-rights migration", accountRightsMigration, "gateway_response = NULL");
requireContains("Account-rights migration", accountRightsMigration, "UPDATE public.analytics_events SET user_id = NULL");
requireContains("Account-rights migration", accountRightsMigration, "DELETE FROM public.email_events");
requireContains("Account-rights migration", accountRightsMigration, "REVOKE EXECUTE ON FUNCTION public.sanitize_account_before_auth_delete");

requireContains("Funding corrections", fundingWorkspace, "FundingIssueReport");
requireContains("Funding-report migration", fundingReportsMigration, "CREATE TABLE IF NOT EXISTS public.funding_opportunity_reports");
requireContains("Funding-report migration", fundingReportsMigration, 'CREATE POLICY "Members submit own funding reports"');
requireContains("Funding-report migration", fundingReportsMigration, 'CREATE POLICY "Staff update funding reports"');
requireContains("Funding-report migration", fundingReportsMigration, "funding_opportunity_reports_active_user_opp_idx");

requireContains("Provider defaults", providerDefaultsMigration, "ALTER COLUMN provider SET DEFAULT 'bachs'");
requireAbsent("Provider defaults", providerDefaultsMigration, /SET DEFAULT 'paystack'/i);
requireContains("Backend payment schema", paymentSchema, 'provider: text("provider").notNull().default("bachs")');
requireContains("Backend payment schema", paymentSchema, 'userId: uuid("user_id")');
requireAbsent("Backend payment schema", paymentSchema, /userId:\s*uuid\("user_id"\)\.notNull\(\)/);
requireAbsent("Backend payment schema", paymentSchema, /default\("paystack"\)/i);
requireContains("Backend DB client", dbClient, "payments,");
requireContains("Backend DB client", dbClient, "paymentWebhookEvents,");

if (failures.length) {
  console.error("release-readiness: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`release-readiness: PASS (${required.length} required artifacts + trust/data-rights/schema invariants)`);
