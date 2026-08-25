import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke, from, maybeSingle } = vi.hoisted(() => ({
  invoke: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@shared/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke },
    from,
  },
}));

vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

import { initCheckout, readPaymentStatus, verifyPayment } from "@/lib/bachs";

describe("Bachs callback verification client", () => {
  beforeEach(() => {
    invoke.mockReset();
    maybeSingle.mockReset();
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle,
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    from.mockReset();
    from.mockReturnValue(query);
  });

  it.each([
    ["success", "success"],
    ["failed", "failed"],
    ["abandoned", "failed"],
    ["initialized", "pending"],
  ] as const)(
    "maps the owner-scoped %s payment row to %s",
    async (stored, expected) => {
      maybeSingle.mockResolvedValue({ data: { status: stored }, error: null });

      await expect(readPaymentStatus("crv_12345678")).resolves.toBe(expected);
    },
  );

  it("keeps processing when the local payment read is temporarily unavailable", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: new Error("network") });

    await expect(readPaymentStatus("crv_12345678")).resolves.toBe("pending");
  });

  it("verifies using Cresciva's internal payment reference", async () => {
    invoke.mockResolvedValue({ data: { status: "success" }, error: null });

    await expect(verifyPayment("crv_12345678")).resolves.toBe("success");
    expect(invoke).toHaveBeenCalledWith("bachs-verify", {
      body: { reference: "crv_12345678" },
    });
  });

  it("returns pending when the verification function is unavailable", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("network") });

    await expect(verifyPayment("crv_12345678")).resolves.toBe("pending");
  });

  it("passes the selected plan code to the server-priced checkout function", async () => {
    invoke.mockResolvedValue({
      data: { checkout_url: "https://checkout.example" },
      error: null,
    });

    await expect(
      initCheckout({ plan_code: "quarterly", currency: "USD" }),
    ).resolves.toEqual({
      checkout_url: "https://checkout.example",
    });
    expect(invoke).toHaveBeenCalledWith("bachs-init", {
      body: { plan_code: "quarterly", currency: "USD" },
    });
  });
});
