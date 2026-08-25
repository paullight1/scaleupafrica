// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CurrentPlanCard } from "./CurrentPlanCard";

const startCheckout = vi.fn();

vi.mock("@/lib/subscription", () => ({
  useSubscription: () => ({
    status: "success",
    data: { has_access: false, expires_at: null, bachs_subscription_id: null },
    active: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/bachs", () => ({
  createPortalSession: vi.fn(),
  useBachsCheckout: () => ({ startCheckout, isPending: false }),
}));

describe("CurrentPlanCard plan selection", () => {
  beforeEach(() => startCheckout.mockClear());

  it("lets a new member choose a quarterly plan before checkout", () => {
    render(<CurrentPlanCard />);

    fireEvent.click(screen.getByRole("button", { name: /choose your plan/i }));

    expect(screen.getByRole("dialog", { name: /choose your membership/i })).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
    expect(screen.getByText("$25")).toBeInTheDocument();
    expect(screen.getByText("$90")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /quarterly/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue with quarterly/i }));

    expect(startCheckout).toHaveBeenCalledWith({
      plan_code: "quarterly",
      currency: "USD",
      next: "/dashboard/account/membership",
    });
  });
});
