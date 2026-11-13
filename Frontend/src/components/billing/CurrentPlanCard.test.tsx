// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CurrentPlanCard } from "./CurrentPlanCard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const startCheckout = vi.fn();
vi.mock("@/hooks/usePricingCurrency", () => ({ usePricingCurrency: () => ({ currency: "USD", setCurrency: vi.fn() }) }));

vi.mock("@/lib/subscription", () => ({
  useSubscription: () => ({
    status: "success",
    data: { has_access: false, expires_at: null },
    active: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/paystack", () => ({
  usePaystackCheckout: () => ({ startCheckout, isPending: false }),
}));

describe("CurrentPlanCard plan selection", () => {
  beforeEach(() => startCheckout.mockClear());

  it("lets a new member choose a quarterly plan before checkout", () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><QueryClientProvider client={new QueryClient()}><CurrentPlanCard /></QueryClientProvider></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /choose your plan/i }));

    expect(screen.getByRole("dialog", { name: /choose your membership/i })).toBeInTheDocument();
    expect(screen.getByText("$6.67")).toBeInTheDocument();
    expect(screen.getByText("$16.67")).toBeInTheDocument();
    expect(screen.getByText("$60")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /quarterly/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue with quarterly/i }));

    expect(startCheckout).toHaveBeenCalledWith({
      plan_code: "quarterly",
      currency: "USD",
      next: "/dashboard/account/membership",
    });
  });
});
