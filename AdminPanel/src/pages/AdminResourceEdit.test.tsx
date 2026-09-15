// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminResourceEdit from "./AdminResourceEdit";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub;

const createResource = vi.fn();
const updateResource = vi.fn();
const fetchResourceLinkPreview = vi.fn();
let adminResource: Record<string, unknown> | null = null;
const LOCAL_DRAFT_KEY = "cresciva:admin:resource-draft:v1:admin-1";

vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "admin-1", email: "admin@cresciva.com" } }),
}));

vi.mock("@shared/hooks/useRole", () => ({
  useRole: () => ({ isAdmin: true, isEditor: false }),
}));

vi.mock("@shared/lib/audit", () => ({ logAdminAction: vi.fn() }));

vi.mock("@/hooks/queries/adminResources", () => ({
  RESOURCE_TYPES: [{ value: "guide", label: "Guide" }, { value: "template", label: "Template" }],
  RESOURCE_STATUSES: [{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }],
  SlugConflictError: class SlugConflictError extends Error {},
  useAdminResource: () => ({ data: adminResource, isLoading: false, isError: false, refetch: vi.fn() }),
  useResourceResponseStats: () => ({ data: { totalResponses: 0, questions: [] }, isLoading: false, isError: false }),
  useCreateResource: () => ({ mutateAsync: createResource, isPending: false }),
  useUpdateResource: () => ({ mutateAsync: updateResource, isPending: false }),
}));

vi.mock("@/lib/resourceLinkPreview", () => ({
  fetchResourceLinkPreview: (...args: unknown[]) => fetchResourceLinkPreview(...args),
}));

vi.mock("@/components/FileUpload", () => ({
  default: ({ kind = "file" }: { kind?: "image" | "file" }) => (
    <button type="button">{kind === "image" ? "Upload image" : "Upload file"}</button>
  ),
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current route">{location.pathname}</output>;
}

function renderNewResource(path = "/admin/resources/new") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes>
        <Route path="/admin/resources/new" element={<AdminResourceEdit />} />
        <Route path="/admin/resources/:id" element={<AdminResourceEdit />} />
        <Route path="/admin/resources" element={<div />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminResourceEdit delivery methods", () => {
  beforeEach(() => {
    createResource.mockReset();
    updateResource.mockReset();
    fetchResourceLinkPreview.mockReset();
    adminResource = null;
    window.localStorage.clear();
  });

  it("asks how the resource will be shared before showing the editor", () => {
    renderNewResource();

    expect(
      screen.getByRole("heading", { name: "How are you sharing this resource?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upload a file/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Paste a link/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  });

  it("shows the upload-specific media controls after choosing upload", async () => {
    renderNewResource();

    fireEvent.click(screen.getByRole("button", { name: /Upload a file/i }));

    expect(await screen.findByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByText("Downloadable file")).toBeInTheDocument();
    expect(screen.queryByLabelText("Resource link")).not.toBeInTheDocument();
  });

  it("fetches link metadata and prefills editable resource fields", async () => {
    fetchResourceLinkPreview.mockResolvedValue({
      url: "https://example.com/guides/funding",
      title: "The Practical Funding Guide",
      description: "A useful guide for founders preparing to raise capital.",
      imageUrl: "https://example.com/images/funding.jpg",
      siteName: "Example Capital",
    });
    renderNewResource();

    fireEvent.click(screen.getByRole("button", { name: /Paste a link/i }));
    const urlInput = await screen.findByLabelText("Resource link");
    fireEvent.change(urlInput, { target: { value: "https://short.example/funding" } });
    fireEvent.click(screen.getByRole("button", { name: "Fetch link details" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Title")).toHaveValue("The Practical Funding Guide");
    });
    expect(screen.getByLabelText("Excerpt")).toHaveValue(
      "A useful guide for founders preparing to raise capital.",
    );
    expect(screen.getByRole("link", { name: "View original link" })).toHaveAttribute(
      "href",
      "https://short.example/funding",
    );
    expect(screen.getByRole("img", { name: "Link preview" })).toHaveAttribute(
      "src",
      "https://example.com/images/funding.jpg",
    );
    expect(screen.queryByText("Downloadable file")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Excerpt"), {
      target: { value: "Administrator-written description." },
    });
    expect(screen.getByLabelText("Excerpt")).toHaveValue("Administrator-written description.");
  });

  it("saves an exact link with its fragment without fetching metadata", async () => {
    createResource.mockResolvedValue({ id: "resource-2", updated_at: "2026-09-08T00:00:00Z" });
    renderNewResource();
    fireEvent.click(screen.getByRole("button", { name: /Paste a link/i }));
    const destination = "https://docs.google.com/presentation/d/example/copy?mode=preview#slide=id.42";
    fireEvent.change(await screen.findByLabelText("Resource link"), { target: { value: destination } });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "My slides" } });
    fireEvent.click(screen.getByRole("button", { name: "Save as draft" }));
    await waitFor(() => expect(createResource).toHaveBeenCalledWith(expect.objectContaining({ file_url: destination })));
    expect(fetchResourceLinkPreview).not.toHaveBeenCalled();
  });

  it("keeps author-written fields and the exact destination when fetching a preview", async () => {
    fetchResourceLinkPreview.mockResolvedValue({ url: "https://example.com/canonical", title: "Remote title", description: "Remote summary", imageUrl: null, siteName: "Example" });
    renderNewResource();
    fireEvent.click(screen.getByRole("button", { name: /Paste a link/i }));
    fireEvent.change(await screen.findByLabelText("Resource link"), { target: { value: "https://example.com/copy#section" } });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "My title" } });
    fireEvent.change(screen.getByLabelText("Excerpt"), { target: { value: "My summary" } });
    fireEvent.click(screen.getByRole("button", { name: "Fetch link details" }));
    await waitFor(() => expect(fetchResourceLinkPreview).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: "Fetch link details" })).toBeEnabled());
    expect(screen.getByLabelText("Title")).toHaveValue("My title");
    expect(screen.getByLabelText("Excerpt")).toHaveValue("My summary");
    expect(screen.getByRole("link", { name: "View original link" })).toHaveAttribute("href", "https://example.com/copy#section");
  });

  it("allows saving a valid link when its optional preview is unavailable", async () => {
    fetchResourceLinkPreview.mockRejectedValue(new Error("This document requires sign-in or sharing permission."));
    createResource.mockResolvedValue({ id: "resource-3", updated_at: "2026-09-08T00:00:00Z" });
    renderNewResource();
    fireEvent.click(screen.getByRole("button", { name: /Paste a link/i }));
    fireEvent.change(await screen.findByLabelText("Resource link"), { target: { value: "https://example.com/private-slides" } });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "My presentation" } });
    fireEvent.click(screen.getByRole("button", { name: "Fetch link details" }));
    expect(await screen.findByText("This document requires sign-in or sharing permission.")).toHaveAttribute("role", "status");
    expect(screen.getByLabelText("Resource link")).toHaveAttribute("aria-invalid", "false");
    fireEvent.click(screen.getByRole("button", { name: "Save as draft" }));
    await waitFor(() => expect(createResource).toHaveBeenCalledWith(expect.objectContaining({ file_url: "https://example.com/private-slides" })));
  });

  it("previews unsaved resources without navigating, saving, or publishing", async () => {
    renderNewResource();
    fireEvent.click(screen.getByRole("button", { name: /Paste a link/i }));
    fireEvent.change(await screen.findByLabelText("Title"), { target: { value: "My unsaved resource" } });
    fireEvent.change(screen.getByLabelText("Excerpt"), { target: { value: "Current draft description" } });
    fireEvent.change(screen.getByLabelText("Resource link"), { target: { value: "https://example.com/slides#page=3" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview resource" }));
    const preview = within(await screen.findByRole("dialog", { name: "Resource preview" }));
    expect(preview.getByRole("heading", { name: "My unsaved resource" })).toBeInTheDocument();
    expect(preview.getByText("Current draft description")).toBeInTheDocument();
    expect(preview.getByRole("link", { name: "Open resource" })).toHaveAttribute("href", "https://example.com/slides#page=3");
    expect(createResource).not.toHaveBeenCalled();
    expect(updateResource).not.toHaveBeenCalled();
    fireEvent.click(preview.getByRole("button", { name: "Close" }));
    expect(screen.getByLabelText("Title")).toHaveValue("My unsaved resource");
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/admin/resources/new");
  });

  it("shows existing Markdown in a rich editor with formatting controls", async () => {
    adminResource = {
      id: "resource-1",
      title: "The Advisor's Playbook",
      slug: "the-advisors-playbook",
      type: "guide",
      category: "Business planning",
      topics: ["Business planning"],
      excerpt: "A practical blueprint.",
      content: "## Start with the business model",
      gated: true,
      featured: true,
      read_time_min: 25,
      status: "published",
      cover_image_url: null,
      file_url: "https://example.com/playbook",
      file_name: "Advisor's Playbook",
      file_size_kb: null,
      published_at: "2026-08-23T00:00:00.000Z",
    };

    renderNewResource("/admin/resources/resource-1");

    expect(await screen.findByRole("toolbar", { name: "Formatting tools" })).toBeInTheDocument();
    expect(screen.getByLabelText("Bold")).toBeInTheDocument();
    expect(screen.getByText("Start with the business model")).toBeInTheDocument();
  });

  it("saves an edited resource as a draft before closing the editor", async () => {
    adminResource = {
      id: "resource-1",
      title: "Published resource",
      slug: "published-resource",
      type: "guide",
      category: "Business planning",
      topics: ["Business planning"],
      excerpt: "A published resource.",
      content: "## Published content",
      gated: true,
      featured: true,
      read_time_min: 25,
      status: "published",
      cover_image_url: null,
      file_url: "https://example.com/published-resource",
      file_name: "Published resource",
      file_size_kb: null,
      published_at: "2026-08-23T00:00:00.000Z",
      updated_at: "2026-08-23T00:00:00.000Z",
    };
    updateResource.mockResolvedValue({ ...adminResource, status: "draft" });

    renderNewResource("/admin/resources/resource-1");
    fireEvent.change(await screen.findByLabelText("Title"), {
      target: { value: "Private revision" },
    });
    fireEvent.click(screen.getByRole("link", { name: "Resources" }));

    await waitFor(() => {
      expect(updateResource).toHaveBeenCalledWith({
        id: "resource-1",
        values: expect.objectContaining({ title: "Private revision", status: "draft" }),
      });
      expect(screen.getByLabelText("Current route")).toHaveTextContent("/admin/resources");
    });
  });

  it("restores an unfinished browser draft and lets the editor discard it", async () => {
    window.localStorage.setItem(
      LOCAL_DRAFT_KEY,
      JSON.stringify({
        version: 1,
        savedAt: "2026-08-29T18:00:00.000Z",
        deliveryKind: "upload",
        linkUrl: "",
        values: {
          title: "Quarterly planning workbook",
          slug: "quarterly-planning-workbook",
          type: "guide",
          category: "Planning",
          topics: "Planning, Operations",
          excerpt: "A work in progress.",
          content: "## First working section",
          gated: false,
          featured: false,
          read_time_min: null,
          status: "draft",
          cover_image_url: null,
          file_url: null,
          file_name: null,
          file_size_kb: null,
        },
      }),
    );

    renderNewResource();

    expect(await screen.findByText("Recovered browser draft")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Quarterly planning workbook");
    expect(screen.getByText("First working section")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Discard recovered draft" }));

    expect(window.localStorage.getItem(LOCAL_DRAFT_KEY)).toBeNull();
    expect(
      screen.getByRole("heading", { name: "How are you sharing this resource?" }),
    ).toBeInTheDocument();
  });

  it("saves unfinished new work in this browser without requiring a valid database row", async () => {
    renderNewResource();
    fireEvent.click(screen.getByRole("button", { name: /Upload a file/i }));
    fireEvent.change(await screen.findByLabelText("Title"), {
      target: { value: "Unfinished funding notes" },
    });

    await waitFor(
      () => {
        const saved = JSON.parse(window.localStorage.getItem(LOCAL_DRAFT_KEY) ?? "null");
        expect(saved?.values.title).toBe("Unfinished funding notes");
        expect(saved?.deliveryKind).toBe("upload");
      },
      { timeout: 2_000 },
    );
    expect(screen.getByText(/Saved in this browser/i)).toBeInTheDocument();
    expect(createResource).not.toHaveBeenCalled();
  });

  it("flushes an unfinished draft before the browser hides the page", async () => {
    renderNewResource();
    fireEvent.click(screen.getByRole("button", { name: /Upload a file/i }));
    fireEvent.change(await screen.findByLabelText("Title"), {
      target: { value: "Draft saved before leaving" },
    });

    fireEvent(window, new Event("pagehide"));

    expect(JSON.parse(window.localStorage.getItem(LOCAL_DRAFT_KEY) ?? "null")).toMatchObject({
      values: { title: "Draft saved before leaving" },
      deliveryKind: "upload",
    });
  });

  it("keeps a newly saved Supabase draft open and clears its browser recovery copy", async () => {
    createResource.mockImplementation(async (values: Record<string, unknown>) => {
      adminResource = {
        id: "saved-draft-1",
        ...values,
        topics: [],
        status: "draft",
        view_count: 0,
        download_count: 0,
        created_at: "2026-08-29T18:05:00.000Z",
        updated_at: "2026-08-29T18:05:00.000Z",
      };
      return adminResource;
    });
    renderNewResource();
    fireEvent.click(screen.getByRole("button", { name: /Upload a file/i }));
    fireEvent.change(await screen.findByLabelText("Title"), {
      target: { value: "Funding readiness workbook" },
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Slug")).toHaveValue("funding-readiness-workbook");
    });
    await waitFor(() => expect(window.localStorage.getItem(LOCAL_DRAFT_KEY)).not.toBeNull(), {
      timeout: 2_000,
    });

    fireEvent.click(screen.getByRole("button", { name: "Save as draft" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Current route")).toHaveTextContent(
        "/admin/resources/saved-draft-1",
      );
    });
    expect(window.localStorage.getItem(LOCAL_DRAFT_KEY)).toBeNull();
    expect(await screen.findByText(/Saved to Cresciva/i)).toBeInTheDocument();
  });
});
