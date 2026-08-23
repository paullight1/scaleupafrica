// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FundingSearch } from "./FundingSearch";

const state = vi.hoisted(() => ({
  result: null as any,
}));

vi.mock("@/hooks/queries/funding", () => ({
  useFundingProfile: () => ({ data: null }),
  buildKeywordChips: () => ["climate grant Africa"],
  useFundingResult: () => ({ data: state.result }),
  useGenerateFunding: () => ({
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    mutate: vi.fn(),
  }),
  fundingErrorMessage: () => "error",
  FundingError: class FundingError extends Error {},
}));

vi.mock("@shared/lib/analytics", () => ({ trackEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/components/funding/OpportunityCard", () => ({
  OpportunityCard: ({ opportunity, primaryApplyEligible }: any) => (
    <div data-testid="opportunity-card">
      <span>{opportunity.title}</span>
      <span>{primaryApplyEligible ? "apply-enabled" : "apply-disabled"}</span>
    </div>
  ),
}));
vi.mock("@/components/funding/OpportunityCardSkeleton", () => ({ OpportunityCardSkeletonList: () => <div>loading</div> }));

function opportunity(title: string, overrides: Record<string, unknown> = {}) {
  return {
    title,
    funder: "Example Funder",
    summary: "Funding for African businesses",
    url: "https://example.org/program",
    tags: [],
    sdg_focus: [],
    past_recipients: [],
    application_tips: [],
    match_reasons: [],
    discovery_source: "verified_feed",
    verification_status: "verified",
    source_checked_at: new Date().toISOString(),
    application_status: "open",
    status_checked_at: new Date().toISOString(),
    deadline_status: "unknown",
    ...overrides,
  };
}

describe("FundingSearch trust groups", () => {
  beforeEach(() => {
    state.result = {
      opportunities: [
        opportunity("AI Candidate", {
          discovery_source: "ai_assisted",
          verification_status: "unverified",
          application_status: "open",
        }),
        opportunity("Upcoming Verified", { application_status: "upcoming" }),
        opportunity("Current Verified"),
      ],
      keywordsRaw: "climate funding",
      generatedAt: new Date().toISOString(),
      cached: false,
    };
  });

  it("renders verified current, other verified, then AI discoveries as separate groups", () => {
    render(<FundingSearch />);
    expect(screen.getByRole("heading", { name: "Verified current matches" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Other verified records" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI discoveries" })).toBeInTheDocument();
    expect(screen.getAllByTestId("opportunity-card").map((node) => node.textContent)).toEqual([
      "Current Verifiedapply-disabled",
      "Upcoming Verifiedapply-disabled",
      "AI Candidateapply-disabled",
    ]);
  });

  it("reports counts by current/verified-watchlist/AI trust class", () => {
    render(<FundingSearch />);
    expect(screen.getByText(/3 results · 1 verified current · 1 verified watchlist · 1 AI discovery/i)).toBeInTheDocument();
  });

  it("never promotes an AI result even when model-shaped data claims it is open", () => {
    render(<FundingSearch />);
    const cards = screen.getAllByTestId("opportunity-card");
    expect(cards[2]).toHaveTextContent("AI Candidate");
    expect(cards[2]).toHaveTextContent("apply-disabled");
  });
});
