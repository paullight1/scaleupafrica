import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@shared/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke },
  },
}));

vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

import { verifyPayment } from "@/lib/bachs";

describe("Bachs callback verification client", () => {
  beforeEach(() => {
    invoke.mockReset();
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
});
