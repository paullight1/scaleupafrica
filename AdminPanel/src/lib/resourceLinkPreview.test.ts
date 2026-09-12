import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchResourceLinkPreview } from "./resourceLinkPreview";

const { invoke, getSession } = vi.hoisted(() => ({ invoke: vi.fn(), getSession: vi.fn() }));

vi.mock("@shared/integrations/supabase/client", () => ({
  supabase: { functions: { invoke }, auth: { getSession } },
}));

describe("fetchResourceLinkPreview", () => {
  beforeEach(() => { invoke.mockReset(); vi.stubEnv("DEV", false); });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("returns metadata from the staff-only preview function", async () => {
    const metadata = {
      url: "https://example.com/guide",
      title: "Guide",
      description: "Description",
      imageUrl: "https://example.com/guide.jpg",
      siteName: "Example",
    };
    invoke.mockResolvedValue({ data: { metadata }, error: null });

    await expect(fetchResourceLinkPreview("https://example.com/guide")).resolves.toEqual(
      metadata,
    );
  });

  it("surfaces a useful error when metadata cannot be loaded", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("Function returned 422") });

    await expect(fetchResourceLinkPreview("http://127.0.0.1/private")).rejects.toThrow(
      "Couldn't read link details",
    );
  });
  it("identifies a missing hosted service without blaming the URL", async () => {
    invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ error: "NOT_FOUND" }), { status: 404 }) } });
    await expect(fetchResourceLinkPreview("https://example.com")).rejects.toThrow("not configured");
  });

  it("uses the authenticated local endpoint during development", async () => {
    vi.stubEnv("DEV", true);
    getSession.mockResolvedValue({ data: { session: { access_token: "test-token" } } });
    const metadata = { url: "https://example.com", title: "Example", description: null, imageUrl: null, siteName: "Example" };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ metadata })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchResourceLinkPreview("https://example.com")).resolves.toEqual(metadata);
    expect(fetchMock).toHaveBeenCalledWith("/admin/__resource-link-preview", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer test-token" }) }));
    expect(invoke).not.toHaveBeenCalled();
  });

  it("explains when the source requires access", async () => {
    invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ error: "source_requires_access" }), { status: 422 }) } });
    await expect(fetchResourceLinkPreview("https://docs.google.com/presentation/d/example")).rejects.toThrow("requires sign-in or sharing permission");
  });
});
