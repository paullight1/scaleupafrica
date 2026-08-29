import { describe, expect, it, vi } from "vitest";

import { handleResourceLinkPreview } from "../../../supabase/functions/_shared/resourceLinkPreviewHandler";

const request = (body: unknown) =>
  new Request("https://example.supabase.co/functions/v1/resource-link-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
    body: JSON.stringify(body),
  });

describe("handleResourceLinkPreview", () => {
  it("rejects callers who are not signed in before fetching an external page", async () => {
    const fetchMetadata = vi.fn();
    const response = await handleResourceLinkPreview(request({ url: "https://example.com" }), {
      authenticate: vi.fn().mockResolvedValue(null),
      isStaff: vi.fn(),
      fetchMetadata,
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(fetchMetadata).not.toHaveBeenCalled();
  });

  it("rejects authenticated non-staff callers", async () => {
    const response = await handleResourceLinkPreview(request({ url: "https://example.com" }), {
      authenticate: vi.fn().mockResolvedValue("user-1"),
      isStaff: vi.fn().mockResolvedValue(false),
      fetchMetadata: vi.fn(),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "forbidden" });
  });

  it("returns fetched metadata to a staff caller", async () => {
    const metadata = {
      url: "https://example.com/guide",
      title: "Funding Guide",
      description: "A practical guide.",
      imageUrl: "https://example.com/guide.jpg",
      siteName: "Example",
    };
    const response = await handleResourceLinkPreview(
      request({ url: "https://example.com/guide?source=admin" }),
      {
        authenticate: vi.fn().mockResolvedValue("staff-1"),
        isStaff: vi.fn().mockResolvedValue(true),
        fetchMetadata: vi.fn().mockResolvedValue({ ok: true, metadata }),
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ metadata });
  });

  it("returns a safe validation error for a blocked destination", async () => {
    const response = await handleResourceLinkPreview(
      request({ url: "http://127.0.0.1/internal" }),
      {
        authenticate: vi.fn().mockResolvedValue("staff-1"),
        isStaff: vi.fn().mockResolvedValue(true),
        fetchMetadata: vi.fn().mockResolvedValue({ ok: false, error: "blocked_host" }),
      },
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "blocked_host" });
  });
});
