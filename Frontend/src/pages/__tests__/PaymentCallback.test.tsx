import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PaymentCallback from "../PaymentCallback";
import { readPaymentStatus, verifyPayment } from "@/lib/bachs";

vi.mock("@/lib/bachs", () => ({
  readPaymentStatus: vi.fn(),
  verifyPayment: vi.fn(),
}));

const mockReadPaymentStatus = vi.mocked(readPaymentStatus);
const mockVerify = vi.mocked(verifyPayment);

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <PaymentCallback />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("PaymentCallback", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockReadPaymentStatus.mockReset();
    mockReadPaymentStatus.mockResolvedValue("pending");
    mockVerify.mockReset();
    mockVerify.mockResolvedValue("pending");
  });

  it("unlocks from the local webhook result without waiting for provider verification", async () => {
    mockReadPaymentStatus.mockResolvedValue("success");
    renderAt("/payment/callback?reference=crv_abc12345");
    expect(await screen.findByText("You're in!")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Open the Funding Radar/i }),
    ).toBeInTheDocument();
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("shows the failed state with payment-support fallback", async () => {
    mockReadPaymentStatus.mockResolvedValue("failed");
    renderAt("/payment/callback?reference=crv_fail1234");
    expect(
      await screen.findByText(/Payment didn't go through/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Contact payment support/i }),
    ).toBeInTheDocument();
  });

  it("moves to background processing and makes only one automatic provider check", async () => {
    vi.useFakeTimers();
    renderAt("/payment/callback?reference=crv_slow1234");

    await advance(29_000);
    expect(screen.getByText(/Activating your membership/i)).toBeInTheDocument();
    expect(mockVerify).not.toHaveBeenCalled();

    await advance(1_000);
    expect(screen.getByText(/Payment is processing/i)).toBeInTheDocument();
    expect(screen.getByText(/00:30 elapsed/i)).toBeInTheDocument();
    expect(mockVerify).toHaveBeenCalledTimes(1);

    await advance(30_000);
    expect(mockVerify).toHaveBeenCalledTimes(1);
  });

  it("keeps checking local state in the background and unlocks when the webhook lands", async () => {
    vi.useFakeTimers();
    renderAt("/payment/callback?reference=crv_background1234");
    await advance(30_000);
    expect(screen.getByText(/Payment is processing/i)).toBeInTheDocument();

    mockReadPaymentStatus.mockResolvedValue("success");
    await advance(12_000);
    expect(screen.getByText("You're in!")).toBeInTheDocument();
  });

  it("lets the user request a provider check while background polling continues", async () => {
    vi.useFakeTimers();
    renderAt("/payment/callback?reference=crv_manual1234");
    await advance(30_000);
    mockVerify.mockClear();
    mockVerify.mockResolvedValue("failed");

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Check with Bachs/i }),
      );
      await Promise.resolve();
    });

    expect(screen.getByText(/Payment didn't go through/i)).toBeInTheDocument();
  });

  it("shows a friendly error when no Cresciva reference is present", async () => {
    renderAt("/payment/callback");
    expect(
      await screen.findByText(/No payment to confirm/i),
    ).toBeInTheDocument();
    expect(mockReadPaymentStatus).not.toHaveBeenCalled();
    expect(mockVerify).not.toHaveBeenCalled();
  });
});
