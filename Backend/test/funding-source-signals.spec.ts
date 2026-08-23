import { describe, expect, it } from "vitest";
import { normalizeFundingSignalsForSource } from "../../supabase/functions/_shared/fundingSourceSignals";
import { deriveFundingEligibilityRules } from "../../Shared/src/lib/fundingEligibilityRules";

const SOURCE_URL = "https://funder.example/program";
const SOURCE_TEXT = `
  <html><body>
    <h1>2026 Growth Fund</h1>
    <p>Applications are now open for the 2026 cohort.</p>
    <p>Applicants must be registered in Nigeria, Kenya or Ghana.</p>
    <p>Growth-stage ventures and non-profit organisations are eligible.</p>
    <p>Applicants must have operated for at least 2 years.</p>
    <p>Deadline: 30 September 2026 at 11:59 PM WAT.</p>
    <a href="/apply">Apply now</a>
  </body></html>
`;

describe("normalizeFundingSignalsForSource", () => {
  it("keeps source-backed open, CTA, link and deadline evidence", () => {
    const signals = normalizeFundingSignalsForSource({
      cycle_label: "2026 cohort",
      explicit_open_text: "Applications are now open",
      explicit_closed_text: null,
      explicit_paused_text: null,
      rolling_text: null,
      application_cta_text: "Apply now",
      application_url: "https://funder.example/apply",
      opens_text: null,
      opens_at: null,
      deadline_text: "Deadline: 30 September 2026 at 11:59 PM WAT.",
      deadline_at: "2026-09-30T23:59:00+01:00",
      deadline_timezone: "WAT",
      source_quotes: ["Applications are now open for the 2026 cohort.", "Deadline: 30 September 2026 at 11:59 PM WAT."],
      eligibility_geography_quotes: ["Applicants must be registered in Nigeria, Kenya or Ghana."],
      eligibility_stage_quotes: ["Growth-stage ventures and non-profit organisations are eligible."],
      eligibility_entity_type_quotes: ["Growth-stage ventures and non-profit organisations are eligible."],
      eligibility_company_age_quotes: ["Applicants must have operated for at least 2 years."],
    }, SOURCE_TEXT, SOURCE_URL);

    expect(signals?.cycle_label).toBe("2026 cohort");
    expect(signals?.explicit_open_text).toBe("Applications are now open");
    expect(signals?.application_cta_text).toBe("Apply now");
    expect(signals?.application_url).toBe("https://funder.example/apply");
    expect(signals?.deadline_at).toBe("2026-09-30T22:59:00.000Z");
    expect(signals?.deadline_timezone).toBe("WAT");
    expect(signals?.source_quotes).toHaveLength(2);
    expect(signals?.eligibility_geography_quotes).toEqual(["Applicants must be registered in Nigeria, Kenya or Ghana."]);
    expect(signals?.eligibility_stage_quotes).toHaveLength(1);
    expect(signals?.eligibility_entity_type_quotes).toHaveLength(1);
    expect(signals?.eligibility_company_age_quotes).toHaveLength(1);

    const derived = deriveFundingEligibilityRules({
      geographyQuotes: signals?.eligibility_geography_quotes ?? [],
      stageQuotes: signals?.eligibility_stage_quotes ?? [],
      entityTypeQuotes: signals?.eligibility_entity_type_quotes ?? [],
      companyAgeQuotes: signals?.eligibility_company_age_quotes ?? [],
    });
    expect(derived.rules.eligibleCountries).toEqual(["Nigeria", "Kenya", "Ghana"]);
    expect(derived.rules.businessStages).toEqual(["growth"]);
    expect(derived.rules.entityTypes).toEqual(["nonprofit"]);
    expect(derived.rules.minCompanyAgeYears).toBe(2);
  });

  it("drops hallucinated status and eligibility quotes not present in fetched source", () => {
    const signals = normalizeFundingSignalsForSource({
      cycle_label: "2026 cohort",
      explicit_open_text: "Guaranteed applications are open worldwide",
      explicit_closed_text: null,
      explicit_paused_text: null,
      rolling_text: null,
      application_cta_text: "Apply now",
      application_url: "https://funder.example/apply",
      opens_text: null,
      opens_at: null,
      deadline_text: null,
      deadline_at: null,
      deadline_timezone: null,
      source_quotes: ["This sentence was never on the page"],
      eligibility_geography_quotes: ["Applicants from every country worldwide may apply."],
      eligibility_stage_quotes: ["Idea-stage ventures are eligible."],
      eligibility_entity_type_quotes: [],
      eligibility_company_age_quotes: [],
    }, SOURCE_TEXT, SOURCE_URL);

    expect(signals?.explicit_open_text).toBeNull();
    expect(signals?.source_quotes).toEqual([]);
    expect(signals?.eligibility_geography_quotes).toEqual([]);
    expect(signals?.eligibility_stage_quotes).toEqual([]);
  });

  it("rejects application URLs that were not linked by the fetched page", () => {
    const signals = normalizeFundingSignalsForSource({
      cycle_label: "2026 cohort",
      explicit_open_text: "Applications are now open",
      application_cta_text: "Apply now",
      application_url: "https://attacker.example/fake-apply",
      deadline_text: null,
      deadline_at: null,
      source_quotes: [],
    }, SOURCE_TEXT, SOURCE_URL);
    expect(signals?.application_url).toBeNull();
  });

  it("rejects a normalized deadline whose source quote supports a different date", () => {
    const signals = normalizeFundingSignalsForSource({
      deadline_text: "Deadline: 30 September 2026 at 11:59 PM WAT.",
      deadline_at: "2026-10-30T23:59:00+01:00",
      source_quotes: ["Deadline: 30 September 2026 at 11:59 PM WAT."],
    }, SOURCE_TEXT, SOURCE_URL);
    expect(signals?.deadline_at).toBeNull();
  });

  it("requires date evidence text before accepting an ISO date", () => {
    const signals = normalizeFundingSignalsForSource({
      deadline_at: "2026-09-30T23:59:00+01:00",
      source_quotes: [],
    }, SOURCE_TEXT, SOURCE_URL);
    expect(signals?.deadline_at).toBeNull();
  });
});
