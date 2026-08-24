import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeConsent } from "./consent";

const client = vi.hoisted(() => ({
  getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
  insert: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@shared/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: client.getUser },
    from: () => ({ insert: client.insert }),
  },
}));

import { trackEvent } from "./analytics";

describe("analytics consent gate", () => {
  beforeEach(() => {
    localStorage.clear();
    client.getUser.mockClear();
    client.insert.mockClear();
  });

  it("does not identify or record a visitor before analytics consent", async () => {
    await trackEvent("page_view");

    expect(client.getUser).not.toHaveBeenCalled();
    expect(client.insert).not.toHaveBeenCalled();
  });

  it("records analytics after the visitor opts in", async () => {
    writeConsent({ analytics: true });
    await trackEvent("page_view");

    expect(client.getUser).toHaveBeenCalledOnce();
    expect(client.insert).toHaveBeenCalledOnce();
  });
});
