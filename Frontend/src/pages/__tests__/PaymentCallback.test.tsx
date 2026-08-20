import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PaymentCallback from "../PaymentCallback";
import { verifyPayment } from "@/lib/bachs";

vi.mock("@/lib/bachs", () => ({ verifyPayment: vi.fn() }));

const mockVerify = vi.mocked(verifyPayment);

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <PaymentCallback />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PaymentCallback", () => {
  beforeEach(() => mockVerify.mockReset());

  it("shows success and unlock CTAs when Bachs verification returns success", async () => {
    mockVerify.mockResolvedValue("success");
    renderAt("/payment/callback?reference=crv_abc12345");
    expect(await screen.findByText("You're in!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open the Funding Radar/i })).toBeInTheDocument();
    expect(mockVerify).toHaveBeenCalledWith("crv_abc12345");
  });

  it("shows the failed state with payment-support fallback", async () => {
    mockVerify.mockResolvedValue("failed");
    renderAt("/payment/callback?reference=crv_fail1234");
    expect(await screen.findByText(/Payment didn't go through/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Contact payment support/i })).toBeInTheDocument();
  });

  it("shows a friendly error when no Cresciva reference is present", async () => {
    renderAt("/payment/callback");
    expect(await screen.findByText(/No payment to confirm/i)).toBeInTheDocument();
    expect(mockVerify).not.toHaveBeenCalled();
  });
});
