import { describe, expect, it } from "vitest";
import {
  BusinessEnrichmentRequestSchema,
  BusinessEnrichmentRunStatusSchema,
  BusinessIdentityCandidateSchema,
  BusinessEnrichmentResponseSchema,
} from "../src/contracts";

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
