import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Pricing from "@/components/landing/Pricing";

vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/components/billing/CheckoutButton", () => ({
  CheckoutButton: ({ planCode, children }: { planCode?: string; children: ReactNode }) => (
    <button data-plan-code={planCode}>{children}</button>
  ),
}));

describe("Pricing", () => {
  it("shows the three USD tiers and sends the selected plan code to checkout", () => {
    const { container } = render(
      <MemoryRouter>
        <Pricing />
      </MemoryRouter>,
    );

    expect(screen.getByText("$10")).toBeInTheDocument();
    expect(screen.getByText("$25")).toBeInTheDocument();
    expect(screen.getByText("$90")).toBeInTheDocument();
    expect(
      Array.from(container.querySelectorAll("button[data-plan-code]"), (button) =>
        button.getAttribute("data-plan-code"),
      ),
    ).toEqual(["monthly", "quarterly", "annual"]);
  });
});
