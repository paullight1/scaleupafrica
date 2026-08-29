// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ADVISORS_PLAYBOOK_SLUG } from "@/content/hardcodedResources";
import { useResourceBySlug, useResources, type ResourceDetailRow } from "./resources";

const { from, maybeSingle, range } = vi.hoisted(() => ({
  from: vi.fn(),
  maybeSingle: vi.fn(),
  range: vi.fn(),
}));

vi.mock("@shared/integrations/supabase/client", () => ({
  supabase: { from },
}));

const databaseResource: ResourceDetailRow = {
  id: "database-advisors-playbook",
  title: "The Advisor's Playbook — edited in Admin",
  slug: ADVISORS_PLAYBOOK_SLUG,
  type: "playbook",
  category: "Business planning",
  excerpt: "The editable database description.",
  content: "## Editable database content",
  cover_image_url: null,
  file_url: "https://example.com/advisors-playbook",
  file_name: "Advisor's Playbook",
  file_size_kb: null,
  topics: ["Business planning"],
  gated: true,
  featured: true,
  read_time_min: 25,
  view_count: 4,
  download_count: 2,
  author_name: "Belinda Nkechi Idinmachi",
  published_at: "2026-08-23T00:00:00.000Z",
  created_at: "2026-08-23T00:00:00.000Z",
};

function wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useResourceBySlug", () => {
  beforeEach(() => {
    from.mockReset();
    maybeSingle.mockReset();
    range.mockReset();
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      contains: vi.fn(),
      or: vi.fn(),
      order: vi.fn(),
      range,
      maybeSingle,
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.contains.mockReturnValue(query);
    query.or.mockReturnValue(query);
    query.order.mockReturnValue(query);
    from.mockReturnValue(query);
  });

  it("prefers the editable database row over the local fallback with the same slug", async () => {
    maybeSingle.mockResolvedValue({ data: databaseResource, error: null });

    const { result } = renderHook(() => useResourceBySlug(ADVISORS_PLAYBOOK_SLUG), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(databaseResource);
  });

  it("does not synthesize a resource when the database confirms the slug is missing", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useResourceBySlug(ADVISORS_PLAYBOOK_SLUG), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("does not duplicate the fallback when the database contains the playbook", async () => {
    range.mockResolvedValue({ data: [databaseResource], error: null, count: 1 });

    const { result } = renderHook(
      () => useResources({ q: "", type: null, topic: null }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].rows).toEqual([databaseResource]);
    expect(result.current.data?.pages[0].count).toBe(1);
  });
});
