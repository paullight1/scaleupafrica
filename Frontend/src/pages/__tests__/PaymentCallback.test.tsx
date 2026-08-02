import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PaymentCallback from "../PaymentCallback";
import { verifyPayment } from "@/lib/paystack";

vi.mock("@/lib/paystack", () => ({ verifyPayment: vi.fn() }));

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

  it("shows success and unlock CTAs when verify returns success", async () => {
    mockVerify.mockResolvedValue("success");
    renderAt("/payment/callback?reference=sua_abc");
    expect(await screen.findByText("You're in!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open the Funding Radar/i })).toBeInTheDocument();
    expect(mockVerify).toHaveBeenCalledWith("sua_abc");
  });

  it("shows the failed state with a concierge fallback", async () => {
    mockVerify.mockResolvedValue("failed");
    renderAt("/payment/callback?reference=sua_fail");
    expect(await screen.findByText(/Payment didn't go through/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /WhatsApp concierge/i })).toBeInTheDocument();
  });

  it("accepts the `trxref` param Paystack also sends", async () => {
    mockVerify.mockResolvedValue("success");
    renderAt("/payment/callback?trxref=sua_trx");
    await waitFor(() => expect(mockVerify).toHaveBeenCalledWith("sua_trx"));
  });

  it("shows a friendly error when no reference is present (never calls verify)", async () => {
    renderAt("/payment/callback");
    expect(await screen.findByText(/No payment to confirm/i)).toBeInTheDocument();
    expect(mockVerify).not.toHaveBeenCalled();
  });
});
