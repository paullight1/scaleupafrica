import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Funding from "@/pages/Funding";

// Controllable subscription status (vi.hoisted so the mock factory can read it).
const sub = vi.hoisted(() => ({ status: "active" as string, refetch: vi.fn() }));

vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "member@example.com" }, loading: false }),
}));

vi.mock("@/lib/subscription", () => ({
  useSubscription: () => ({ status: sub.status, active: sub.status === "active", refetch: sub.refetch }),
}));

// Sibling-owned (Plan 06) — mock so the paywall CTA renders.
vi.mock("@/hooks/usePaystack", () => ({
  usePaystackCheckout: () => ({ startCheckout: vi.fn(), isPending: false }),
}));

// Avoid mounting the feed (react-query) — the gate routing is what we test here.
vi.mock("@/components/funding/FundingWorkspace", () => ({
  FundingWorkspace: () => <div data-testid="funding-workspace">workspace</div>,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <Funding />
    </MemoryRouter>,
  );
}

describe("Funding gate", () => {
  beforeEach(() => {
    sub.status = "active";
    sub.refetch.mockClear();
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
});
