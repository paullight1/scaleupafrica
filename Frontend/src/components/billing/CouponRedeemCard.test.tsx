import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CouponRedeemCard } from "./CouponRedeemCard";

const redeem = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/queries/coupons", () => ({ redeemCoupon: redeem }));

function mount() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><QueryClientProvider client={client}><CouponRedeemCard /></QueryClientProvider></MemoryRouter>);
  return invalidate;
}

describe("coupon redemption", () => {
  beforeEach(() => { redeem.mockReset(); });
  it("grants access without checkout and refreshes membership after confirmation", async () => {
    redeem.mockResolvedValue({ access_expires_at: "2026-11-11T12:00:00Z", already_redeemed: false });
    const invalidate = mount();
    fireEvent.change(screen.getByLabelText("Coupon code"), { target: { value: "  cres-test  " } });
    fireEvent.click(screen.getByRole("button", { name: "Redeem coupon" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/membership.*active/i));
    expect(redeem).toHaveBeenCalledWith("CRES-TEST");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["subscription"] });
  });
  it("shows server rejection without claiming access", async () => {
    redeem.mockRejectedValue(new Error("This coupon has expired."));
    mount();
    fireEvent.change(screen.getByLabelText("Coupon code"), { target: { value: "EXPIRED" } });
    fireEvent.click(screen.getByRole("button", { name: "Redeem coupon" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("This coupon has expired."));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
