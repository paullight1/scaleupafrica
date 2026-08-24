import { describe, expect, it } from "vitest";
import { getInquiryDetails, matchesInquiryClassification } from "./inquiries";

describe("inquiry classification", () => {
  it("reads support area and business sector from lead metadata", () => {
    expect(
      getInquiryDetails("contact", {
        support_area: "funding_support",
        business_sector: "Technology & Software",
      }),
    ).toEqual({
      area: "funding_support",
      areaLabel: "Funding support",
      sector: "Technology & Software",
    });
  });

  it("classifies gated downloads as resource inquiries without extra form fields", () => {
    expect(getInquiryDetails("resource_download", {})).toEqual({
      area: "resources",
      areaLabel: "Resources",
      sector: null,
    });
  });

  it("matches area and sector filters against normalized metadata", () => {
    const lead = {
      source: "contact",
      metadata: { support_area: "partnerships", business_sector: "Manufacturing" },
    };

    expect(matchesInquiryClassification(lead, { area: "partnerships", sector: "Manufacturing" })).toBe(true);
    expect(matchesInquiryClassification(lead, { area: "funding_support", sector: "Manufacturing" })).toBe(false);
  });
});
