import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ApplicationStatusSchema, DeadlineStatusSchema } from "../src/contracts";

const signalPath = resolve(process.cwd(), "../supabase/functions/_shared/fundingSourceSignals.ts");
const refreshPath = resolve(process.cwd(), "../supabase/functions/funding-source-refresh/index.ts");
const aggregatePath = resolve(process.cwd(), "../supabase/functions/aggregate-funding/index.ts");
const provenanceMigrationPath = resolve(process.cwd(), "../supabase/migrations/20260822023000_funding_intelligence_v2.sql");
const applicationStatusMigrationPath = resolve(process.cwd(), "../supabase/migrations/20260822050000_opportunity_application_status.sql");
const signalSource = existsSync(signalPath) ? readFileSync(signalPath, "utf8") : "";
const refreshSource = existsSync(refreshPath) ? readFileSync(refreshPath, "utf8") : "";
const aggregateSource = existsSync(aggregatePath) ? readFileSync(aggregatePath, "utf8") : "";
const provenanceMigrationSource = existsSync(provenanceMigrationPath) ? readFileSync(provenanceMigrationPath, "utf8") : "";
const applicationStatusMigrationSource = existsSync(applicationStatusMigrationPath) ? readFileSync(applicationStatusMigrationPath, "utf8") : "";

describe("Funding application status contracts", () => {
  it("keeps application status bounded", () => {
    expect(ApplicationStatusSchema.options).toEqual([
      "open",
      "closing_soon",
      "rolling",
      "upcoming",
      "closed",
      "paused",
      "unknown",
    ]);
  });

  it("separates deadline provenance from application status", () => {
    expect(DeadlineStatusSchema.options).toEqual(["confirmed", "rolling", "unknown"]);
  });
});

describe("Funding source extraction trust boundary", () => {
  it("uses supplied source text only and never assigns trusted status", () => {
    expect(signalSource).toContain("Use only supplied source text");
    expect(signalSource).toContain("Do not infer open from a future deadline alone");
    expect(signalSource).toContain("Do not substitute a historical or typical deadline");
    expect(signalSource).toContain("Return null for unsupported fields");
    expect(signalSource).toContain("Do not output a trusted application_status");
  });

  it("requires bounded refresh orchestration and deterministic classification", () => {
    expect(refreshSource).toContain("MAX_BATCH = 25");
    expect(refreshSource).toContain("safeExternalFetch");
    expect(refreshSource).toContain("classifyFundingStatus");
    expect(refreshSource).toContain("funding_source_checks");
    expect(refreshSource).toContain("FUNDING_REFRESH_SECRET");
    expect(refreshSource).toContain("timingSafeEqual");
  });

  it("requires an active authoritative source-registry match before verification or canonical status refresh", () => {
    expect(provenanceMigrationSource).toContain("funding_source_is_registered");
    expect(provenanceMigrationSource).toContain("Source URL must match an active authoritative funding source");
    expect(provenanceMigrationSource).toContain("target_path");
    expect(provenanceMigrationSource).toContain("base_path");
    expect(refreshSource).toContain("source_not_registered");
    expect(refreshSource).toContain("if(!sourceId)");
    expect(applicationStatusMigrationSource).toContain("Canonical funding status requires an active registered source");
    expect(applicationStatusMigrationSource).toContain("_source_id IS NULL");
    expect(applicationStatusMigrationSource).toContain("funding_source_is_registered(_source_url)");
  });

  it("requires a fresh verification timestamp to transition an invalidated record back to verified", () => {
    expect(provenanceMigrationSource).toContain("Verified transition requires a fresh verification timestamp");
    expect(provenanceMigrationSource).toContain("NEW.last_verified_at IS NOT DISTINCT FROM OLD.last_verified_at");
  });

  it("revokes dependent verification and cycle trust when a registered source is disabled", () => {
    expect(applicationStatusMigrationSource).toContain("new_source.active IS DISTINCT FROM old_source.active");
    expect(applicationStatusMigrationSource).toContain("new_source.active = false");
    expect(applicationStatusMigrationSource).toContain("funding_sources_trust_invalidation");
    expect(applicationStatusMigrationSource).toContain("AFTER UPDATE OF base_url, active ON public.funding_sources");
    expect(applicationStatusMigrationSource).toContain("application_status = 'unknown'");
    expect(applicationStatusMigrationSource).toContain("verification_status = 'unverified'");
  });

  it("keeps authoritative source history by disallowing source deletion from app roles", () => {
    expect(provenanceMigrationSource).toContain("REVOKE DELETE ON public.funding_sources FROM authenticated");
    expect(provenanceMigrationSource).toContain("REVOKE DELETE ON public.funding_sources FROM service_role");
  });

  it("forces AI and non-verified cached discovery to unknown application status", () => {
    expect(aggregateSource).toContain('application_status:"unknown"');
    expect(aggregateSource).toContain('verification_status:"unverified"');
    expect(aggregateSource).toContain("effectiveFundingStatus");
    expect(aggregateSource).toContain("status_checked_at");
  });
});
