import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@shared/integrations/supabase/client", () => ({
  supabase: { auth: { getSession }, functions: { invoke: vi.fn() } },
}));

import { fundingEngineApi } from "./fundingEngineApi";

describe("fundingEngineApi.addSource", () => {
  beforeEach(() => {
    vi.stubEnv("DEV", true);
    getSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    getSession.mockReset();
  });

  it("sends a named URL to the authenticated local engine relay", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: 42 } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fundingEngineApi.addSource({
        name: "Grant source",
        url: "https://grants.example",
        category: "grant",
      }),
    ).resolves.toEqual({ success: true, data: { id: 42 } });

    expect(fetchMock).toHaveBeenCalledWith(
      "/admin/__funding-engine/sources",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
        body: JSON.stringify({
          name: "Grant source",
          url: "https://grants.example",
          category: "grant",
        }),
      }),
    );
  });
});
