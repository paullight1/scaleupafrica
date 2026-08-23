// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DashboardHome } from "./DashboardHome";

vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "founder@example.com" } }),
}));
vi.mock("@/hooks/queries/dashboard", () => ({
  useMyProfile: () => ({
    data: { founder_name: "Ada", business_name: "Ada Labs", status: "active", view_count: 3 },
    isPending: false,
  }),
  useMySubscription: () => ({ data: { has_access: false, expires_at: null }, isPending: false, isError: false }),
  useSavedOpportunities: () => ({ data: [], isError: false }),
  useFundingFeed: () => ({ data: [] }),
  useFundingTeaser: () => ({ isPending: false, isError: true, data: undefined, refetch: vi.fn() }),
}));
vi.mock("@/lib/dashboard/onboarding", () => ({ onboardingState: () => ({ complete: true }) }));
vi.mock("@/lib/dashboard/profileCompleteness", () => ({ computeCompleteness: () => ({ percent: 100, missing: [] }) }));
vi.mock("@/components/dashboard/ClosingSoonCard", () => ({ ClosingSoonCard: () => null }));
vi.mock("@/components/dashboard/MatchedOpportunities", () => ({ MatchedOpportunities: () => null }));
vi.mock("@/components/dashboard/FundingTeaserPanel", () => ({ FundingTeaserPanel: () => null }));
vi.mock("@/components/dashboard/OnboardingCard", () => ({ OnboardingCard: () => null }));
vi.mock("@/hooks/useBachs", () => ({
  useBachsCheckout: () => ({ startCheckout: vi.fn(), isPending: false }),
}));

describe("DashboardHome funding fallback", () => {
  it("shows the useful membership paywall when the non-member teaser cannot load", () => {
    render(
      <MemoryRouter>
        <DashboardHome />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /members only/i })).toBeInTheDocument();
    expect(screen.queryByText(/couldn't load this week's funding/i)).not.toBeInTheDocument();
  });
});
