import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ApplicationStatusSchema, DeadlineStatusSchema } from "../src/contracts";

const signalPath = resolve(process.cwd(), "../supabase/functions/_shared/fundingSourceSignals.ts");
const refreshPath = resolve(process.cwd(), "../supabase/functions/funding-source-refresh/index.ts");
const aggregatePath = resolve(process.cwd(), "../supabase/functions/aggregate-funding/index.ts");
const signalSource = existsSync(signalPath) ? readFileSync(signalPath, "utf8") : "";
const refreshSource = existsSync(refreshPath) ? readFileSync(refreshPath, "utf8") : "";
const aggregateSource = existsSync(aggregatePath) ? readFileSync(aggregatePath, "utf8") : "";

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

  it("forces AI and non-verified cached discovery to unknown application status", () => {
    expect(aggregateSource).toContain('application_status:"unknown"');
    expect(aggregateSource).toContain('verification_status:"unverified"');
    expect(aggregateSource).toContain("effectiveFundingStatus");
    expect(aggregateSource).toContain("status_checked_at");
  });
});