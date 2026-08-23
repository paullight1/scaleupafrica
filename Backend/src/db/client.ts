import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as coreSchema from "./schema";
import { payments, paymentWebhookEvents } from "./payment-schema";
import {
  businessEnrichmentRuns,
  businessEnrichmentCandidates,
  fundingSourcesRegistry,
  fundingSourceChecks,
  memberOpportunityState,
  notificationEvents,
} from "./funding-intelligence-schema";

/**
 * postgres-js + drizzle. The direct Postgres connection BYPASSES RLS (connects as
 * `postgres`, so auth.uid() is NULL) — which is exactly why every handler derives
 * ownership from the JWT `sub`, never from client input.
 *
 * `prepare: false` is mandatory with Supavisor transaction pooling.
 * Same-table projections (`profileFundingIntelligence`, `fundingOpportunityStatus`)
 * are intentionally not registered because coreSchema already owns those SQL tables.
 *
 * The current Bachs/data-rights payment projections intentionally override the
 * historical payment definitions in coreSchema.
 */
export const dbSchema = {
  ...coreSchema,
  payments,
  paymentWebhookEvents,
  businessEnrichmentRuns,
  businessEnrichmentCandidates,
  fundingSourcesRegistry,
  fundingSourceChecks,
  memberOpportunityState,
  notificationEvents,
};
export type Db = ReturnType<typeof drizzle<typeof dbSchema>>;

export function createDb(databaseUrl: string): { db: Db; close: () => Promise<void> } {
  const sql = postgres(databaseUrl, { prepare: false, max: 10 });
  const db = drizzle(sql, { schema: dbSchema });
  return { db, close: () => sql.end({ timeout: 5 }) };
}

export const DB = "DB";
