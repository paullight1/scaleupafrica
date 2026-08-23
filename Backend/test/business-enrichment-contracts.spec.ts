import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BusinessEnrichmentRequestSchema,
  BusinessEnrichmentRunStatusSchema,
  BusinessIdentityCandidateSchema,
  BusinessEnrichmentResponseSchema,
} from "../src/contracts";

const sharedPath = resolve(process.cwd(), "../supabase/functions/_shared/businessDiscovery.ts");
const edgePath = resolve(process.cwd(), "../supabase/functions/business-enrichment/index.ts");
const configPath = resolve(process.cwd(), "../supabase/config.toml");
const sharedSource = existsSync(sharedPath) ? readFileSync(sharedPath, "utf8") : "";
const edgeSource = existsSync(edgePath) ? readFileSync(edgePath, "utf8") : "";
const configSource = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";

describe("Business Enrichment contracts", () => {
  it("keeps the run state machine bounded", () => {
    expect(BusinessEnrichmentRunStatusSchema.options).toEqual([
      "pending",
      "resolved",
      "ambiguous",
      "not_found",
      "failed",
    ]);
  });

  it("accepts business name as the only required enrichment input", () => {
    expect(BusinessEnrichmentRequestSchema.parse({ businessName: "Top100 Africa Future Leaders" })).toEqual({
      businessName: "Top100 Africa Future Leaders",
    });
  });

  it("rejects unexpected request fields", () => {
    expect(() =>
      BusinessEnrichmentRequestSchema.parse({ businessName: "Acme", confirmed: true }),
    ).toThrow();
  });

  it("bounds identity confidence and source evidence", () => {
    expect(() =>
      BusinessIdentityCandidateSchema.parse({
        id: "candidate-1",
        canonicalName: "Acme",
        identityConfidence: 101,
        sourceUrls: ["https://example.com"],
      }),
    ).toThrow();
  });

  it("allows ambiguous responses without inventing a selected candidate", () => {
    const parsed = BusinessEnrichmentResponseSchema.parse({
      runId: "00000000-0000-4000-8000-000000000001",
      state: "ambiguous",
      candidates: [],
    });
    expect(parsed.state).toBe("ambiguous");
    expect(parsed.selectedCandidate).toBeUndefined();
  });
});

describe("business enrichment Edge trust boundary", () => {
  it("requires JWT authentication at the function boundary", () => {
    expect(edgeSource).toContain("auth.getUser");
    expect(edgeSource).toContain('error: "unauthorized"');
    expect(configSource).toContain("[functions.business-enrichment]");
    expect(configSource).toContain("verify_jwt = true");
  });

  it("bounds public discovery and keeps provider credentials at the edge boundary", () => {
    expect(edgeSource).toContain("BRAVE_SEARCH_API_KEY");
    expect(sharedSource).toContain("MAX_SEARCH_RESULTS = 8");
    expect(sharedSource).toContain("MAX_EVIDENCE_FETCHES = 6");
    expect(sharedSource).toContain("safeExternalFetch");
    expect(edgeSource).toContain("selectBusinessIdentity");
    expect(edgeSource).toContain("business_enrichment_candidates");
  });

  it("forces AI extraction to use only supplied evidence", () => {
    expect(sharedSource).toContain("Use only the supplied public evidence");
    expect(sharedSource).toContain("Do not use model memory");
    expect(sharedSource).toContain("Return null or [] for unsupported fields");
    expect(sharedSource).toContain("source_urls");
  });

  it("persists only evidence URLs Cresciva actually fetched", () => {
    expect(sharedSource).toContain("allowedEvidenceUrls");
    expect(sharedSource).toContain("evidence.map((page) => page.url)");
    expect(sharedSource).toContain("allowedEvidenceUrls.has(url)");
    expect(sharedSource).toContain("if (!canonicalName || !sourceUrls.length) return null");
  });

  it("drops unsupported enriched facts instead of trusting model output without field evidence", () => {
    expect(sharedSource).toContain("hasFieldEvidence");
    expect(sharedSource).toContain('hasFieldEvidence(fieldEvidence, "country")');
    expect(sharedSource).toContain('hasFieldEvidence(fieldEvidence, "organisation_type")');
    expect(sharedSource).toContain('hasFieldEvidence(fieldEvidence, "sectors")');
    expect(sharedSource).toContain('hasFieldEvidence(fieldEvidence, "operating_countries")');
    expect(sharedSource).toContain('hasFieldEvidence(fieldEvidence, "founding_year")');
    expect(sharedSource).toContain('hasFieldEvidence(fieldEvidence, "keywords")');
  });

  it("forbids sensitive demographic inference", () => {
    expect(sharedSource).toContain("Never infer sensitive personal characteristics");
    expect(sharedSource).toContain("religion");
    expect(sharedSource).toContain("ethnicity");
    expect(sharedSource).toContain("sexual orientation");
  });

  it("degrades cleanly when the optional discovery provider is unavailable", () => {
    expect(sharedSource).toContain("provider_unavailable");
    expect(edgeSource).toContain("business_enrichment_failed");
  });
});
