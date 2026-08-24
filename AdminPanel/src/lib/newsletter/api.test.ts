import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn());

vi.mock("@shared/integrations/supabase/client", () => ({
  supabase: { functions: { invoke } },
}));

import { newsletterAdmin } from "./api";

describe("newsletterAdmin", () => {
  beforeEach(() => invoke.mockReset());

  it("unwraps a successful newsletter action", async () => {
    invoke.mockResolvedValue({ data: { data: { configured: true, connected: true } }, error: null });

    await expect(newsletterAdmin("settings.health", {})).resolves.toEqual({ configured: true, connected: true });
    expect(invoke).toHaveBeenCalledWith("newsletter-admin", {
      body: { action: "settings.health", payload: {} },
    });
  });

  it("surfaces the server message without exposing response internals", async () => {
    invoke.mockResolvedValue({
      data: { error: "Brevo sender is not configured", code: "PROVIDER_NOT_CONFIGURED" },
      error: null,
    });

    await expect(newsletterAdmin("settings.health", {})).rejects.toThrow("Brevo sender is not configured");
  });

  it("uses a stable fallback for transport failures", async () => {
    invoke.mockResolvedValue({ data: null, error: { message: "FunctionsFetchError: internal detail" } });

    await expect(newsletterAdmin("overview", {})).rejects.toThrow("Newsletter service is unavailable");
  });
});
