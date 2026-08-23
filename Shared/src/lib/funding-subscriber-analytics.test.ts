import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENT_TYPES, sanitizeAnalyticsMetadata } from "./analytics";

describe("funding subscriber analytics", () => {
  it("contains the paid Funding Radar lifecycle events", () => {
    expect(ANALYTICS_EVENT_TYPES).toEqual(expect.arrayContaining([
      "recommendation_impression",
      "recommendation_open",
      "recommendation_apply_click",
      "recommendation_save",
      "recommendation_not_relevant",
      "application_started",
      "application_submitted",
      "application_won",
      "application_rejected",
    ]));
  });

  it("drops raw source/search/page content even if a caller supplies it", () => {
    const sanitized = sanitizeAnalyticsMetadata({
      match_score: 91,
      verification_status: "verified",
      raw_query: "women founder agritech grant in Lagos",
      source_text: "full fetched funding page",
      response_body: "raw provider response",
      page_content: "private page text",
      search_text: "full user search",
    });
    expect(sanitized).toEqual({
      match_score: 91,
      verification_status: "verified",
    });
  });

  it("bounds retained strings and nested metadata", () => {
    const sanitized = sanitizeAnalyticsMetadata({
      reason: "x".repeat(1000),
      state: { application_status: "open", source_registry_linked: true },
    });
    expect((sanitized.reason as string).length).toBeLessThanOrEqual(240);
    expect(sanitized.state).toEqual({ application_status: "open", source_registry_linked: true });
  });
});