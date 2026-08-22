import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Funding Intelligence schema additions live here so the core schema mirror does
 * not become a catch-all. Supabase migrations remain the only DDL authority.
 */
export const businessEnrichmentRuns = pgTable(
  "business_enrichment_runs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    businessNameInput: text("business_name_input").notNull(),
    websiteHint: text("website_hint"),
    countryHint: text("country_hint"),
    status: text("status").notNull().default("pending"),
    selectedCandidateId: uuid("selected_candidate_id"),
    candidateCount: integer("candidate_count").notNull().default(0),
    errorClass: text("error_class"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("business_enrichment_runs_user_started_idx").on(t.userId, t.startedAt)],
);

export const businessEnrichmentCandidates = pgTable(
  "business_enrichment_candidates",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    runId: uuid("run_id").notNull(),
    canonicalName: text("canonical_name").notNull(),
    website: text("website"),
    country: text("country"),
    summary: text("summary"),
    identityConfidence: integer("identity_confidence").notNull(),
    sourceUrls: text("source_urls").array().notNull().default(sql`'{}'::text[]`),
    enrichedProfile: jsonb("enriched_profile").notNull().default(sql`'{}'::jsonb`),
    fieldEvidence: jsonb("field_evidence").notNull().default(sql`'{}'::jsonb`),
    memberState: text("member_state").notNull().default("proposed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("business_enrichment_candidates_run_idx").on(t.runId, t.identityConfidence)],
);

/**
 * A focused projection of the private Funding Intelligence columns that live on
 * public.profiles. It is deliberately NOT registered in the relational dbSchema
 * because coreSchema already owns the public.profiles table. Drizzle table
 * objects can still be used for select/update queries independently.
 */
export const profileFundingIntelligence = pgTable("profiles", {
  userId: uuid("user_id").notNull(),
  businessStage: text("business_stage"),
  fundingTargetUsd: numeric("funding_target_usd"),
  preferredFundingTypes: text("preferred_funding_types").array().notNull().default(sql`'{}'::text[]`),
  applicationReadiness: text("application_readiness"),
  organisationType: text("organisation_type"),
  operatingCountries: text("operating_countries").array().notNull().default(sql`'{}'::text[]`),
  foundingYear: integer("founding_year"),
  businessIdentityConfirmedAt: timestamp("business_identity_confirmed_at", { withTimezone: true }),
  businessIdentitySourceUrls: text("business_identity_source_urls").array().notNull().default(sql`'{}'::text[]`),
  businessIdentityRunId: uuid("business_identity_run_id"),
  businessIdentityCandidateId: uuid("business_identity_candidate_id"),
});

export type BusinessEnrichmentRunRow = typeof businessEnrichmentRuns.$inferSelect;
export type BusinessEnrichmentCandidateRow = typeof businessEnrichmentCandidates.$inferSelect;
export type ProfileFundingIntelligenceRow = typeof profileFundingIntelligence.$inferSelect;
