import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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

/** Same-table projection: private fields only; not registered in dbSchema. */
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

/** Same-table projection: current-cycle status only; not registered in dbSchema. */
export const fundingOpportunityStatus = pgTable("funding_opportunities", {
  id: uuid("id").notNull(),
  applicationStatus: text("application_status").notNull().default("unknown"),
  statusCheckedAt: timestamp("status_checked_at", { withTimezone: true }),
  statusEvidenceUrl: text("status_evidence_url"),
  opensAt: timestamp("opens_at", { withTimezone: true }),
  deadlineAt: timestamp("deadline_at", { withTimezone: true }),
  deadlineTimezone: text("deadline_timezone"),
  deadlineStatus: text("deadline_status").notNull().default("unknown"),
  currentCycleLabel: text("current_cycle_label"),
  applicationUrl: text("application_url"),
});

export const fundingSourcesRegistry = pgTable(
  "funding_sources",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    baseUrl: text("base_url").notNull(),
    sourceType: text("source_type").notNull().default("official_program"),
    countryFocus: text("country_focus").array().notNull().default(sql`'{}'::text[]`),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    active: boolean("active").notNull().default(true),
    refreshIntervalHours: integer("refresh_interval_hours").notNull().default(24),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("funding_sources_active_idx").on(t.active, t.lastCheckedAt)],
);

export const fundingSourceChecks = pgTable(
  "funding_source_checks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    checkKey: uuid("check_key").notNull().unique(),
    opportunityId: uuid("opportunity_id").notNull(),
    sourceId: uuid("source_id"),
    sourceUrl: text("source_url").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    httpStatus: integer("http_status"),
    contentType: text("content_type"),
    contentBytes: integer("content_bytes"),
    sourceFingerprint: text("source_fingerprint"),
    extractedSignals: jsonb("extracted_signals").notNull().default(sql`'{}'::jsonb`),
    classifiedStatus: text("classified_status").notNull().default("unknown"),
    errorClass: text("error_class"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("funding_source_checks_opportunity_idx").on(t.opportunityId, t.checkedAt),
    index("funding_source_checks_source_idx").on(t.sourceId, t.checkedAt),
  ],
);

export type BusinessEnrichmentRunRow = typeof businessEnrichmentRuns.$inferSelect;
export type BusinessEnrichmentCandidateRow = typeof businessEnrichmentCandidates.$inferSelect;
export type ProfileFundingIntelligenceRow = typeof profileFundingIntelligence.$inferSelect;
export type FundingOpportunityStatusRow = typeof fundingOpportunityStatus.$inferSelect;
export type FundingSourceCheckRow = typeof fundingSourceChecks.$inferSelect;
