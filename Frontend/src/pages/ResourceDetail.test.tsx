// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResourceDetail from "./ResourceDetail";

const { refetch, replace, close, showError, showSuccess, requestDownload } = vi.hoisted(() => ({
  refetch: vi.fn(), replace: vi.fn(), close: vi.fn(), showError: vi.fn(), showSuccess: vi.fn(), requestDownload: vi.fn(),
}));
const resource = {
  id: "resource-1", slug: "guide", title: "Saved guide", type: "guide", topics: [],
  file_url: "https://example.com/old-link", gated: false, content: "Guide content", additional_questions: [],
};
vi.mock("@/hooks/queries/resources", () => ({
  useResourceBySlug: () => ({ data: resource, isLoading: false, isError: false, refetch }),
  useRelatedResources: () => ({ data: [] }),
  resourceTypeLabel: () => "Guide",
}));
vi.mock("@shared/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "reader" }, loading: false }) }));
vi.mock("@shared/integrations/supabase/client", () => ({ supabase: { rpc: () => Promise.resolve({}) } }));
vi.mock("@shared/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/email", () => ({ requestResourceDownload: requestDownload }));
vi.mock("sonner", () => ({ toast: { error: showError, success: showSuccess } }));

function renderResource() { render(<MemoryRouter><ResourceDetail /></MemoryRouter>); }

describe("Resource download destination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resource.additional_questions = [];
    requestDownload.mockResolvedValue({ ok: true });
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

  it("captures the configured answers before sending the download request", async () => {
    resource.additional_questions = [
      { id: "company_name", label: "Company name", type: "text", options: [], required: true, enabled: true },
      { id: "employee_range", label: "Number of employees", type: "select", options: ["1–5"], required: true, enabled: true },
      { id: "hear_about_us", label: "How did you hear about us?", type: "select", options: ["Instagram"], required: true, enabled: true },
      { id: "country", label: "Which country do you reside in?", type: "text", options: [], required: true, enabled: true },
    ];
    renderResource();
    fireEvent.change(screen.getByLabelText("Company name *"), { target: { value: "Acme" } });
    fireEvent.change(screen.getByLabelText("Number of employees *"), { target: { value: "1–5" } });
    fireEvent.change(screen.getByLabelText("How did you hear about us? *"), { target: { value: "Instagram" } });
    fireEvent.change(screen.getByLabelText("Which country do you reside in? *"), { target: { value: "Nigeria" } });
    fireEvent.change(screen.getByLabelText("Email *"), { target: { value: "reader@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to access" }));
    await waitFor(() => expect(requestDownload).toHaveBeenCalledWith(expect.objectContaining({
      email: "reader@example.com",
      company: "Acme",
      answers: expect.objectContaining({ company_name: "Acme", employee_range: "1–5", hear_about_us: "Instagram", country: "Nigeria" }),
    })));
  });
});
