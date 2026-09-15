import { describe, expect, it } from "vitest";
import { buildFundingImportPayload } from "./fundingEngineImport";

describe("buildFundingImportPayload", () => {
  it("maps an Edutu grant into a reviewable unpublished funding opportunity", () => {
    expect(buildFundingImportPayload({
      id: "edutu-42",
      title: "Women-led Climate Grant",
      summary: "Support for climate ventures.",
      organization: "Example Foundation",
      close_date: "2026-12-01",
      source_url: "https://example.org/grant",
      application_url: "https://example.org/apply",
      tags: ["grants", "climate"],
    })).toMatchObject({
      title: "Women-led Climate Grant",
      funder: "Example Foundation",
      summary: "Support for climate ventures.",
      deadline: "2026-12-01",
      url: "https://example.org/apply",
      source_url: "https://example.org/grant",
      source_name: "Edutu Engine",
      source: "ai",
      status: "draft",
      featured: false,
      tags: ["grants", "climate"],
    });
  });
});
