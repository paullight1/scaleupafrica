// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResourceDetail from "./ResourceDetail";

const { refetch, replace, close, showError } = vi.hoisted(() => ({
  refetch: vi.fn(), replace: vi.fn(), close: vi.fn(), showError: vi.fn(),
}));
const resource = {
  id: "resource-1", slug: "guide", title: "Saved guide", type: "guide", topics: [],
  file_url: "https://example.com/old-link", gated: false, content: "Guide content",
};
vi.mock("@/hooks/queries/resources", () => ({
  useResourceBySlug: () => ({ data: resource, isLoading: false, isError: false, refetch }),
  useRelatedResources: () => ({ data: [] }),
  resourceTypeLabel: () => "Guide",
}));
vi.mock("@shared/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "reader" }, loading: false }) }));
vi.mock("@shared/integrations/supabase/client", () => ({ supabase: { rpc: () => Promise.resolve({}) } }));
vi.mock("@shared/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/email", () => ({ requestResourceDownload: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: showError } }));

function renderResource() { render(<MemoryRouter><ResourceDetail /></MemoryRouter>); }

describe("Resource download destination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "open").mockReturnValue({ opener: null, location: { replace }, close } as unknown as Window);
  });

  it("opens the exact latest saved link instead of the old page value", async () => {
    const exact = "https://docs.google.com/presentation/d/example/copy?mode=preview#slide=id.42";
    refetch.mockResolvedValue({ data: { ...resource, file_url: exact }, error: null });
    renderResource();
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith(exact));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("never opens a cached link when the latest read fails", async () => {
    refetch.mockResolvedValue({ data: resource, error: new Error("offline") });
    renderResource();
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
    expect(showError).toHaveBeenCalledWith("Couldn't verify the latest download link. Please try again.");
  });

  it("does not open a resource that has been unpublished or removed", async () => {
    refetch.mockResolvedValue({ data: null, error: null });
    renderResource();
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
  });
});
