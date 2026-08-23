// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useFundingTeaser } from "./dashboard";

const db = vi.hoisted(() => {
  const client: { rpc?: ReturnType<typeof vi.fn> } = {};
  client.rpc = vi.fn(function (this: unknown) {
    if (this !== client) throw new Error("rpc lost its Supabase client context");
    return Promise.resolve({
      data: [
        {
          id: "opp-1",
          title: "Growth Fund",
          funder: "Cresciva Foundation",
          type: "grant",
          deadline: null,
          total_published: 7,
        },
      ],
      error: null,
    });
  });
  return { client };
});

vi.mock("@shared/integrations/supabase/client", () => ({ supabase: db.client }));
vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));
vi.mock("@/lib/api/flags", () => ({ useApiFor: () => false }));

describe("useFundingTeaser", () => {
  it("calls the teaser RPC with its Supabase client context intact", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useFundingTeaser(true), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      items: [
        {
          id: "opp-1",
          title: "Growth Fund",
          funder: "Cresciva Foundation",
          type: "grant",
          deadline: null,
        },
      ],
      totalPublished: 7,
    });
  });
});
