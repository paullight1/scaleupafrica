import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminCoupons from "./AdminCoupons";

const generate = vi.hoisted(() => vi.fn());
const revoke = vi.hoisted(() => vi.fn());
const coupon = { id: "c1", code: "CRES-WELCOME", created_at: "2026-11-04T00:00:00Z", created_by: "admin", expires_at: "2099-11-11T00:00:00Z", active: true, max_redemptions: 1, redemption_count: 0 };
vi.mock("@/hooks/queries/coupons", () => ({
  COUPON_PAGE_SIZE: 24,
  useAdminCoupons: () => ({ data: { coupons: [coupon], total: 1 }, isLoading: false, isError: false, refetch: vi.fn() }),
  useGenerateCoupons: () => ({ mutateAsync: generate, isPending: false, data: undefined }),
  useRevokeCoupon: () => ({ mutateAsync: revoke, isPending: false }),
}));
vi.mock("@shared/lib/crossApp", () => ({ siteUrl: (path: string) => `https://cresciva.com${path}` }));

describe("admin coupons", () => {
  beforeEach(() => { generate.mockReset(); revoke.mockReset(); });
  it("sends the selected count, expiry, and unlimited-use setting", async () => {
    generate.mockResolvedValue([coupon]);
    render(<AdminCoupons />);
    fireEvent.change(screen.getByLabelText("Number of coupons"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Redemption deadline"), { target: { value: "month" } });
    fireEvent.change(screen.getByLabelText("Usage limit"), { target: { value: "unlimited" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate coupons" }));
    await waitFor(() => expect(generate).toHaveBeenCalledWith({ count: 25, expiry: "month", unlimited: true, code: "" }));
  });
  it("lets the administrator copy the saved code", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<AdminCoupons />);
    fireEvent.click(screen.getByRole("button", { name: "Copy CRES-WELCOME" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("CRES-WELCOME"));
  });
});
