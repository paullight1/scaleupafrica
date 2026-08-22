import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENT_TYPES } from "./analytics";

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
      "recommendation_open",
      "recommendation_save",
      "opportunity_source_click",
    ]));
    expect(ANALYTICS_EVENT_TYPES.some((event) => /raw|source_body|page_text/.test(event))).toBe(false);
  });
});
