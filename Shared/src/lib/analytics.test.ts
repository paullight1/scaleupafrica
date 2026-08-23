import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENT_TYPES, sanitizeAnalyticsMetadata } from "./analytics";

describe("Funding Intelligence analytics vocabulary", () => {
  it("includes the business enrichment lifecycle", () => {
    expect(ANALYTICS_EVENT_TYPES).toEqual(expect.arrayContaining([
      "business_enrichment_started",
      "business_enrichment_result",
      "business_enrichment_failed",
      "business_identity_confirmed",
      "business_identity_rejected",
    ]));
  });

  it("includes recommendation/application feedback without raw evidence events", () => {
    expect(ANALYTICS_EVENT_TYPES).toEqual(expect.arrayContaining([
      "recommendation_impression",
      "recommendation_open",
      "recommendation_save",
      "recommendation_not_relevant",
      "application_started",
      "application_submitted",
      "application_won",
      "application_rejected",
      "opportunity_source_click",
    ]));
    expect(ANALYTICS_EVENT_TYPES.some((event) => /raw|source_body|page_text/.test(event))).toBe(false);
  });

  it("drops raw funding/search/source content while retaining bounded aggregate metadata", () => {
    const sanitized = sanitizeAnalyticsMetadata({
      match_score: 92,
      application_status: "open",
      raw_query: "Nigeria agritech climate grant",
      source_body: "third-party source body that must never enter analytics",
      nested: {
        page_text: "full HTML-derived page text",
        count: 4,
        label: "x".repeat(400),
      },
    });

    expect(sanitized).toMatchObject({
      match_score: 92,
      application_status: "open",
      nested: { count: 4 },
    });
    expect(sanitized).not.toHaveProperty("raw_query");
    expect(sanitized).not.toHaveProperty("source_body");
    expect((sanitized.nested as Record<string, unknown>)).not.toHaveProperty("page_text");
    expect(String((sanitized.nested as Record<string, unknown>).label).length).toBeLessThanOrEqual(240);
  });
});
