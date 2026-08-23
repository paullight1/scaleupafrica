import { describe, expect, it } from "vitest";
import { deriveFundingEligibilityRules } from "./fundingEligibilityRules";

describe("deriveFundingEligibilityRules", () => {
  it("extracts explicit African country eligibility from source-backed quotes", () => {
    const result = deriveFundingEligibilityRules({
      geographyQuotes: ["Applicants must be registered in Nigeria, Kenya or Ghana."],
      stageQuotes: [],
      entityTypeQuotes: [],
      companyAgeQuotes: [],
    });
    expect(result.rules.geographyScope).toBe("countries");
    expect(result.rules.eligibleCountries).toEqual(["Nigeria", "Kenya", "Ghana"]);
  });

  it("recognises explicit global and pan-African scope but does not guess sub-Saharan scope", () => {
    expect(deriveFundingEligibilityRules({ geographyQuotes: ["Applications are open to organisations worldwide."], stageQuotes: [], entityTypeQuotes: [], companyAgeQuotes: [] }).rules.geographyScope).toBe("global");
    expect(deriveFundingEligibilityRules({ geographyQuotes: ["African businesses may apply."], stageQuotes: [], entityTypeQuotes: [], companyAgeQuotes: [] }).rules.geographyScope).toBe("pan_african");
    expect(deriveFundingEligibilityRules({ geographyQuotes: ["Applicants must operate in Sub-Saharan Africa."], stageQuotes: [], entityTypeQuotes: [], companyAgeQuotes: [] }).rules.geographyScope).toBe("unknown");
  });

  it("normalises conservative stage aliases", () => {
    const result = deriveFundingEligibilityRules({
      geographyQuotes: [],
      stageQuotes: ["The programme supports idea-stage, early-stage and growth-stage ventures."],
      entityTypeQuotes: [],
      companyAgeQuotes: [],
    });
    expect(result.rules.businessStages).toEqual(["idea", "early", "growth"]);
  });

  it("normalises nonprofit and for-profit entity eligibility", () => {
    const result = deriveFundingEligibilityRules({
      geographyQuotes: [],
      stageQuotes: [],
      entityTypeQuotes: ["Eligible applicants include NGOs, non-profits and for-profit SMEs."],
      companyAgeQuotes: [],
    });
    expect(result.rules.entityTypes).toEqual(["nonprofit", "for_profit"]);
  });

  it("parses unambiguous company-age minimum and maximum rules", () => {
    const result = deriveFundingEligibilityRules({
      geographyQuotes: [],
      stageQuotes: [],
      entityTypeQuotes: [],
      companyAgeQuotes: ["Applicants must have operated for at least 2 years and no more than 5 years."],
    });
    expect(result.rules.minCompanyAgeYears).toBe(2);
    expect(result.rules.maxCompanyAgeYears).toBe(5);
  });

  it("leaves ambiguous age wording unstructured instead of guessing", () => {
    const result = deriveFundingEligibilityRules({
      geographyQuotes: [],
      stageQuotes: [],
      entityTypeQuotes: [],
      companyAgeQuotes: ["We prefer established organisations with several years of experience."],
    });
    expect(result.rules.minCompanyAgeYears).toBeNull();
    expect(result.rules.maxCompanyAgeYears).toBeNull();
  });

  it("retains the exact source quote categories as evidence", () => {
    const quotes = {
      geographyQuotes: ["Applicants must be registered in Nigeria."],
      stageQuotes: ["Growth-stage ventures are eligible."],
      entityTypeQuotes: ["For-profit companies may apply."],
      companyAgeQuotes: ["Applicants must have operated for at least 2 years."],
    };
    expect(deriveFundingEligibilityRules(quotes).evidence).toEqual(quotes);
  });
});
