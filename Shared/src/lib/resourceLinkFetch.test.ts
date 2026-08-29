import { describe, expect, it, vi } from "vitest";

import { fetchResourceLinkMetadata } from "../../../supabase/functions/_shared/resourceLinkMetadata";

describe("fetchResourceLinkMetadata", () => {
  it("returns normalized page metadata from the final redirected URL", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      url: "https://example.com/final",
      status: 200,
      contentType: "text/html",
      bytes: 256,
      body: `
        <html><head>
          <meta property="og:title" content="Growth Workbook">
          <meta property="og:description" content="Exercises for sustainable growth.">
          <meta property="og:image" content="/growth.jpg">
        </head></html>
      `,
    });

    await expect(
      fetchResourceLinkMetadata("https://short.example/growth", fetcher),
    ).resolves.toEqual({
      ok: true,
      metadata: {
        url: "https://example.com/final",
        title: "Growth Workbook",
        description: "Exercises for sustainable growth.",
        imageUrl: "https://example.com/growth.jpg",
        siteName: "example.com",
      },
    });
  });

  it("returns a stable error when the external page is blocked or unavailable", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      url: null,
      status: null,
      error: "blocked_host",
    });

    await expect(
      fetchResourceLinkMetadata("http://127.0.0.1/private", fetcher),
    ).resolves.toEqual({ ok: false, error: "blocked_host" });
  });
});
