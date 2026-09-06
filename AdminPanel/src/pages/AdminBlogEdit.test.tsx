// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminBlogEdit from "./AdminBlogEdit";

const saveBlogPost = vi.fn();
let existingPost: Record<string, unknown> | null = null;
const LOCAL_DRAFT_KEY = "cresciva:admin:blog-draft:v1:admin-1:new";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub;

vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "admin-1", email: "admin@cresciva.com" } }),
}));

vi.mock("@shared/hooks/useRole", () => ({
  useRole: () => ({ isAdmin: true, isEditor: false }),
}));

vi.mock("@/hooks/queries/adminBlog", () => ({
  useAdminBlogPost: () => ({ data: existingPost, isLoading: false, isError: false, refetch: vi.fn() }),
  useSaveBlogPost: () => ({ mutateAsync: saveBlogPost, isPending: false }),
  isDuplicateSlugError: () => false,
}));

vi.mock("@/components/FileUpload", () => ({
  default: () => <button type="button">Upload image</button>,
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current route">{location.pathname}</output>;
}

function renderPost(path = "/admin/blog/new") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes>
        <Route path="/admin/blog/new" element={<AdminBlogEdit />} />
        <Route path="/admin/blog/:id" element={<AdminBlogEdit />} />
        <Route path="/admin/blog" element={<div />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderNewPost() {
  return renderPost();
}

describe("AdminBlogEdit draft recovery", () => {
  beforeEach(() => {
    existingPost = null;
    saveBlogPost.mockReset();
    window.localStorage.clear();
  });

  it("restores an unfinished post after the editor is remounted", async () => {
    const view = renderNewPost();
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "A post worth finishing" },
    });
    fireEvent.change(screen.getByLabelText("Content (Markdown)"), {
      target: { value: "## Keep going" },
    });

    await waitFor(() => {
      expect(window.localStorage.getItem(LOCAL_DRAFT_KEY)).not.toBeNull();
    }, { timeout: 2_000 });

    expect(screen.getByLabelText("Title")).toHaveValue("A post worth finishing");
    expect(screen.getByLabelText("Content (Markdown)")).toHaveValue("## Keep going");

    view.unmount();
    renderNewPost();

    expect(await screen.findByText("Recovered browser draft")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("A post worth finishing");
    expect(screen.getByLabelText("Content (Markdown)")).toHaveValue("## Keep going");
  });

  it("flushes the post draft before the browser hides the page", async () => {
    renderNewPost();
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Saved when I switch away" },
    });

    fireEvent(window, new Event("pagehide"));

    expect(JSON.parse(window.localStorage.getItem(LOCAL_DRAFT_KEY) ?? "null")).toMatchObject({
      values: { title: "Saved when I switch away" },
    });
  });

  it("saves an edited post as a draft before closing the editor", async () => {
    existingPost = {
      id: "post-1",
      title: "Published post",
      slug: "published-post",
      category: "Funding",
      tags: ["funding"],
      excerpt: "A published post.",
      content: "## Published content",
      featured: false,
      read_time_min: 5,
      status: "published",
      seo_title: null,
      seo_description: null,
      cover_image_url: null,
      published_at: "2026-08-23T00:00:00.000Z",
    };
    saveBlogPost.mockResolvedValue({ ...existingPost, status: "draft", published_at: null });

    renderPost("/admin/blog/post-1");
    const titleInput = await screen.findByLabelText("Title");
    await waitFor(() => expect(titleInput).toHaveValue("Published post"));
    fireEvent.change(titleInput, {
      target: { value: "Private revision" },
    });
    fireEvent.click(screen.getByRole("link", { name: /Back to blog/i }));

    await waitFor(() => {
      expect(saveBlogPost).toHaveBeenCalledWith({
        id: "post-1",
        values: expect.objectContaining({ title: "Private revision", status: "draft" }),
      });
      expect(screen.getByLabelText("Current route")).toHaveTextContent("/admin/blog");
    });
  });
});
