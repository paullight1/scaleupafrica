import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const required = [
  "docs/operations/PAYMENT_SUPPORT.md",
  "docs/operations/FUNDING_CORRECTIONS.md",
  "docs/operations/SUPPORT.md",
  "docs/production-readiness/evidence/backend-cutover.md",
  "docs/production-readiness/evidence/web-quality-report.md",
  "docs/production-readiness/evidence/observability-alerts.md",
  "docs/production-readiness/evidence/legal-support-readiness.md",
  "docs/production-readiness/evidence/supabase-security-review.md",
  "docs/production-readiness/evidence/funding-intelligence-certification.md",
  "supabase/migrations/20260823093000_account_data_rights.sql",
  "supabase/migrations/20260823094500_funding_corrections.sql",
  "supabase/functions/account-data/index.ts",
  "Frontend/src/components/dashboard/DataRightsCard.tsx",
  "Frontend/src/components/funding/FundingIssueReport.tsx",
  "AdminPanel/src/pages/AdminFundingReports.tsx",
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

const [pkg, config, terms, privacy, backendEnv, health, accountData, fundingWorkspace] = await Promise.all([
  text("package.json"),
  text("supabase/config.toml"),
  text("Frontend/src/pages/Terms.tsx"),
  text("Frontend/src/pages/Privacy.tsx"),
  text("Backend/src/config/env.ts"),
  text("Backend/src/health/health.controller.ts"),
  text("supabase/functions/account-data/index.ts"),
  text("Frontend/src/components/funding/FundingWorkspace.tsx"),
]);

function requireContains(label, source, needle) {
  if (!source.includes(needle)) failures.push(`${label} missing ${needle}`);
}
function requireAbsent(label, source, pattern) {
  if (pattern.test(source)) failures.push(`${label} contains forbidden ${pattern}`);
}

requireContains("package.json", pkg, '"node": ">=22"');
requireContains("package.json", pkg, '"verify:web-quality"');
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
requireAbsent("Privacy", privacy, /Paystack/i);

requireContains("Backend env", backendEnv, "production origins must be explicit non-local HTTPS origins");
requireContains("Backend health", health, "ServiceUnavailableException");
requireContains("Account deletion", accountData, "DELETE MY ACCOUNT");
requireContains("Account deletion", accountData, "prepare_account_deletion");
requireContains("Funding corrections", fundingWorkspace, "FundingIssueReport");

if (failures.length) {
  console.error("release-readiness: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`release-readiness: PASS (${required.length} required artifacts + trust invariants)`);
