// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FundingWorkspace } from "./FundingWorkspace";

const state = vi.hoisted(() => ({
  feed: [] as any[],
  profile: null as any,
  identity: null as any,
}));
const analytics = vi.hoisted(() => ({ trackEvent: vi.fn() }));

vi.mock("@shared/lib/analytics", () => ({ trackEvent: analytics.trackEvent }));
vi.mock("@/hooks/queries/funding", () => ({
  useFundingFeed: () => ({ data: state.feed, isPending: false, isError: false, refetch: vi.fn() }),
  useFundingProfile: () => ({ data: state.profile, isPending: false, isError: false }),
}));
vi.mock("@/hooks/queries/businessEnrichment", () => ({
  useConfirmedBusinessIdentity: () => ({ data: state.identity, isPending: false }),
}));
vi.mock("@/hooks/queries/memberOpportunityState", () => ({
  useMemberOpportunityStates: () => ({ data: [], isPending: false, isError: false, refetch: vi.fn() }),
  useSetMemberOpportunityState: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/components/funding/BusinessEnrichmentPanel", () => ({
  BusinessEnrichmentPanel: () => <div>Tell Cresciva your organisation</div>,
}));
vi.mock("@/components/funding/FundingProfilePrompt", () => ({
  FundingProfilePrompt: () => <div>Funding profile prompt</div>,
}));
vi.mock("@/components/funding/FundingNotificationPreferences", () => ({
  FundingNotificationPreferences: () => <div>Funding alert preferences</div>,
}));
vi.mock("@/components/funding/FundingSearch", () => ({ FundingSearch: () => <div>Funding search</div> }));
vi.mock("@/components/funding/OpportunityCard", () => ({
  OpportunityCard: ({ opportunity, primaryApplyEligible }: any) => <div><span>{opportunity.title}</span><span>{primaryApplyEligible ? "primary-apply" : "not-primary"}</span></div>,
}));

function item(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: `Opportunity ${id}`,
    funder: "Example Funder",
    type: "Grant",
    summary: "Agritech climate funding in Nigeria",
    amount: "$50k",
    opens: "",
    deadline: "",
    eligibility: "Nigerian agritech businesses",
    url: `https://example.org/${id}`,
    tags: ["agritech", "climate"],
    countryFocus: ["Nigeria"],
    featured: false,
    details: {},
    lastVerifiedAt: new Date().toISOString(),
    verificationStatus: "verified",
    sourceUrl: `https://example.org/${id}`,
    sourceName: "Example Funder",
    storedApplicationStatus: "open",
    applicationStatus: "open",
    statusCheckedAt: new Date().toISOString(),
    statusEvidenceUrl: `https://example.org/${id}`,
    opensAt: null,
    deadlineAt: null,
    deadlineTimezone: null,
    deadlineStatus: "unknown",
    currentCycleLabel: "2026",
    applicationUrl: `https://example.org/${id}/apply`,
    discovery_source: "verified_feed",
    verification_status: "verified",
    match_reasons: [],
    sdg_focus: [],
    past_recipients: [],
    application_tips: [],
    ...overrides,
  };
}

const profile = {
  business_name: "Acme",
  country: "Nigeria",
  operating_countries: [] as string[],
  organisation_type: null as string | null,
  founding_year: null as number | null,
  sector: "Agritech",
  keywords: ["agritech", "climate"],
  short_description: "Agritech climate business",
  long_description: null,
  business_stage: null,
  funding_target_usd: null,
  preferred_funding_types: [],
  application_readiness: "ready",
};

describe("FundingWorkspace paid surfaces", () => {
  beforeEach(() => {
    analytics.trackEvent.mockReset();
    state.feed = [];
    state.profile = { ...profile, operating_countries: [] };
    state.identity = { country: "Nigeria", summary: "Agritech climate business", enrichedProfile: {} };
  });

  it("shows only verified fresh eligible open records in the default primary view", () => {
    state.feed = [
      item("open"),
      item("closed", { applicationStatus: "closed", storedApplicationStatus: "closed" }),
      item("ai", { verificationStatus: "unverified", verification_status: "unverified", discovery_source: "ai_assisted", applicationStatus: "unknown", storedApplicationStatus: "unknown" }),
    ];
    render(<FundingWorkspace />);
    expect(screen.getByText("Opportunity open")).toBeInTheDocument();
    expect(screen.getByText("primary-apply")).toBeInTheDocument();
    expect(screen.queryByText("Opportunity closed")).toBeNull();
    expect(screen.queryByText("Opportunity ai")).toBeNull();
  });

  it("uses confirmed operating countries in hard geographic eligibility", () => {
    state.profile = { ...profile, operating_countries: ["Kenya"] };
    state.feed = [item("kenya", { countryFocus: ["Kenya"] })];
    render(<FundingWorkspace />);
    expect(screen.getByText("Opportunity kenya")).toBeInTheDocument();
    expect(screen.getByText("primary-apply")).toBeInTheDocument();
  });

  it("uses confirmed founding year for structured company-age eligibility", () => {
    state.profile = { ...profile, founding_year: 2020 };
    state.feed = [item("age", { details: { min_company_age_years: 3 } })];
    render(<FundingWorkspace />);
    expect(screen.getByText("Opportunity age")).toBeInTheDocument();
    expect(screen.getByText("primary-apply")).toBeInTheDocument();
  });

  it("renders the exact truthful zero state instead of padding primary recommendations", () => {
    state.feed = [item("closed", { applicationStatus: "closed", storedApplicationStatus: "closed" })];
    render(<FundingWorkspace />);
    expect(screen.getByText("You’re not currently eligible for any verified open opportunities.")).toBeInTheDocument();
    expect(screen.getByText(/We’ll keep checking verified sources/i)).toBeInTheDocument();
  });

  it("keeps AI discovery in Explore", () => {
    state.feed = [item("ai", { verificationStatus: "unverified", verification_status: "unverified", discovery_source: "ai_assisted", applicationStatus: "unknown", storedApplicationStatus: "unknown" })];
    render(<FundingWorkspace />);
    fireEvent.click(screen.getByRole("tab", { name: /Explore 1/i }));
    expect(screen.getByText("Opportunity ai")).toBeInTheDocument();
    expect(screen.getByText("not-primary")).toBeInTheDocument();
  });

  it("requires organisation confirmation before eligibility-based recommendations", () => {
    state.profile = null;
    state.identity = null;
    state.feed = [item("open")];
    render(<FundingWorkspace />);
    expect(screen.getByText("Tell Cresciva your organisation")).toBeInTheDocument();
    expect(screen.getByText(/Confirm your organisation or enter your business details/i)).toBeInTheDocument();
    expect(screen.queryByText("Opportunity open")).toBeNull();
  });

  it("mounts profile and funding-alert controls without turning the unit test into a Supabase integration test", () => {
    state.feed = [item("open")];
    render(<FundingWorkspace />);
    expect(screen.getByText("Funding profile prompt")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Funding alerts"));
    expect(screen.getByText("Funding alert preferences")).toBeInTheDocument();
  });

  it("emits one bounded impression per visible opportunity and surface", () => {
    state.feed = [item("open")];
    render(<FundingWorkspace />);
    expect(analytics.trackEvent).toHaveBeenCalledWith(
      "recommendation_impression",
      expect.objectContaining({
        entityType: "funding_opportunity",
        entityId: "open",
        metadata: expect.objectContaining({
          surface: "open_for_you",
          verification_status: "verified",
          application_status: "open",
          primary_apply_eligible: true,
        }),
      }),
    );
  });
});
