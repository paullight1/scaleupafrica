import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardFunding from "@/pages/dashboard/DashboardFunding";

// Controllable subscription status (vi.hoisted so the mock factory can read it).
const sub = vi.hoisted(() => ({ status: "active" as string, refetch: vi.fn() }));
const teaser = vi.hoisted(() => ({
  isPending: false,
  isError: false,
  data: {
    items: [
      { id: "o1", title: "GIZ Green Fund", funder: "GIZ", type: "grant", deadline: null },
    ],
    totalPublished: 19,
  } as unknown,
  refetch: vi.fn(),
}));

vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "member@example.com" }, loading: false }),
}));

vi.mock("@/lib/subscription", () => ({
  useSubscription: () => ({
    status: sub.status,
    active: sub.status === "active",
    refetch: sub.refetch,
  }),
}));

vi.mock("@/hooks/queries/dashboard", () => ({
  useFundingTeaser: () => teaser,
}));

vi.mock("@/hooks/usePaystack", () => ({
  usePaystackCheckout: () => ({ startCheckout: vi.fn(), isPending: false }),
}));

// Avoid mounting the feed (react-query) — the gate routing is what we test here.
vi.mock("@/components/funding/FundingWorkspace", () => ({
  FundingWorkspace: () => <div data-testid="funding-workspace">workspace</div>,
}));
vi.mock("@/components/dashboard/SavedOpportunities", () => ({
  SavedOpportunities: () => <div data-testid="saved">saved</div>,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardFunding />
    </MemoryRouter>,
  );
}

describe("Funding gate", () => {
  beforeEach(() => {
    sub.status = "active";
    sub.refetch.mockClear();
    teaser.isPending = false;
    teaser.isError = false;
  });

  it("TRUST-CRITICAL: a subscription fetch error shows ErrorState + Retry, never the paywall", () => {
    sub.status = "error";
    renderPage();
    expect(screen.getByText(/couldn't confirm your membership/i)).toBeInTheDocument();
    expect(screen.queryByText(/members only/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(sub.refetch).toHaveBeenCalled();
  });

  it("inactive subscription shows the paywall, no workspace", () => {
    sub.status = "inactive";
    renderPage();
    expect(screen.getByText(/members only/i)).toBeInTheDocument();
    expect(screen.queryByTestId("funding-workspace")).toBeNull();
  });

  it("active subscription shows the workspace, no paywall", () => {
    sub.status = "active";
    renderPage();
    expect(screen.getByTestId("funding-workspace")).toBeInTheDocument();
    expect(screen.queryByText(/members only/i)).toBeNull();
  });

  it("shows a non-member real opportunity titles and the locked remainder", () => {
    sub.status = "inactive";
    renderPage();
    // A real title, not an "example" card.
    expect(screen.getByText("GIZ Green Fund")).toBeInTheDocument();
    // 19 published - 1 shown = 18 withheld.
    expect(screen.getByText(/\+18 more/i)).toBeInTheDocument();
  });

  it("never asks a member to pay for the teaser round-trip", () => {
    sub.status = "active";
    renderPage();
    // The teaser panel must not render for an active member at all.
    expect(screen.queryByText("GIZ Green Fund")).toBeNull();
  });
});
