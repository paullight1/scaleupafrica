import { describe, it, expect, vi, beforeEach } from "vitest";

const { getSession, refreshSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock("@shared/integrations/supabase/client", () => ({
  supabase: { auth: { getSession, refreshSession } },
}));

import { apiRequest, ApiError } from "../client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(status === 204 || body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiRequest", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getSession.mockReset();
    refreshSession.mockReset();
    getSession.mockResolvedValue({ data: { session: { access_token: "tok-123" } } });
  });

  it("attaches the Supabase bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/health");

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-123");
  });

  it("omits Authorization when there is no session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/health");
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("serializes a JSON body and sets Content-Type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/profiles/me", { method: "PUT", body: { business_name: "Acme" } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe(JSON.stringify({ business_name: "Acme" }));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("skips empty/undefined query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/profiles", { query: { q: "shea", country: undefined, page: 2 } });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("q=shea");
    expect(url).toContain("page=2");
    expect(url).not.toContain("country");
  });

  it("refreshes the session and retries once on 401, then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: "UNAUTHENTICATED", message: "no" } }, 401))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await apiRequest<{ ok: boolean }>("/subscriptions/me");
    expect(res.ok).toBe(true);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws a typed ApiError with code + fields on error responses", async () => {
    const body = {
      error: { code: "VALIDATION_ERROR", message: "bad", fields: { business_name: ["required"] } },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(body, 400)));

    await expect(apiRequest("/profiles/me", { method: "PUT", body: {} })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
      fields: { business_name: ["required"] },
    });
  });

  it("returns undefined for an empty 200 body (e.g. /funding/latest)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 200 })));
    const res = await apiRequest("/funding/latest");
    expect(res).toBeUndefined();
  });

  it("maps a non-JSON error body to a generic ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    await expect(apiRequest("/health")).rejects.toBeInstanceOf(ApiError);
  });
});
