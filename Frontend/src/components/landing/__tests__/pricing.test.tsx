import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Pricing from "@/components/landing/Pricing";

vi.mock("@/hooks/queries/directory", () => ({ useOwnProfile: () => ({ data: { country: "Nigeria" } }) }));

vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/components/billing/CheckoutButton", () => ({
  CheckoutButton: ({ planCode, children }: { planCode?: string; children: ReactNode }) => (
    <button data-plan-code={planCode}>{children}</button>
  ),
}));

describe("Pricing", () => {
  it("shows Nigerian prices and supports switching to USD and sends the selected plan code to checkout", () => {
    const { container } = render(
      <MemoryRouter>
        <Pricing />
      </MemoryRouter>,
    );

    expect(screen.getByText("₦10,000")).toBeInTheDocument();
    expect(screen.getByText("₦25,000")).toBeInTheDocument();
    expect(screen.getByText("₦90,000")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /USD/ }));
    expect(screen.getByText("$6.67")).toBeInTheDocument();
    expect(screen.getByText("$16.67")).toBeInTheDocument();
    expect(screen.getByText("$60")).toBeInTheDocument();
    expect(
      Array.from(container.querySelectorAll("button[data-plan-code]"), (button) =>
        button.getAttribute("data-plan-code"),
      ),
    ).toEqual(["monthly", "quarterly", "annual"]);
  });
});
