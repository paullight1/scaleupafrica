import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchResourceLinkPreview } from "./resourceLinkPreview";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@shared/integrations/supabase/client", () => ({
  supabase: { functions: { invoke } },
}));

describe("fetchResourceLinkPreview", () => {
  beforeEach(() => invoke.mockReset());

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
});
