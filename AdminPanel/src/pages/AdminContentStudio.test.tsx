// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminBlog from "./AdminBlog";
import AdminResources from "./AdminResources";

const mutate = vi.fn();

const posts = [
  {
    id: "post-1",
    title: "Build with confidence",
    slug: "build-with-confidence",
    status: "published",
    category: "Leadership",
    tags: ["growth"],
    view_count: 4200,
    updated_at: "2026-08-20T10:00:00.000Z",
    cover_image_url: null,
    featured: true,
  },
  {
    id: "post-2",
    title: "Draft field notes",
    slug: "draft-field-notes",
    status: "draft",
    category: "Ideas",
    tags: [],
    view_count: 80,
    updated_at: "2026-08-21T10:00:00.000Z",
    cover_image_url: null,
    featured: false,
  },
];

const resources = [
  {
    id: "resource-1",
    title: "Pitch like a pro",
    slug: "pitch-like-a-pro",
    status: "published",
    type: "template",
    category: "Funding",
    view_count: 700,
    download_count: 320,
    updated_at: "2026-08-20T10:00:00.000Z",
    cover_image_url: null,
    gated: true,
    featured: true,
  },
  {
    id: "resource-2",
    title: "Founder checklist",
    slug: "founder-checklist",
    status: "draft",
    type: "checklist",
    category: "Operations",
    view_count: 20,
    download_count: 0,
    updated_at: "2026-08-21T10:00:00.000Z",
    cover_image_url: null,
    gated: false,
    featured: false,
  },
];

vi.mock("@shared/hooks/useRole", () => ({
  useRole: () => ({ isAdmin: true, isEditor: false }),
}));

vi.mock("@/hooks/queries/adminBlog", () => ({
  useAdminBlogPosts: () => ({ data: posts, isLoading: false, isError: false, refetch: vi.fn() }),
  useTogglePublish: () => ({ mutate, isPending: false }),
  useDuplicateBlogPost: () => ({ mutate, isPending: false }),
  useDeleteBlogPost: () => ({ mutate, isPending: false }),
}));

vi.mock("@/hooks/queries/adminResources", () => ({
  resourceTypeLabel: (value: string) => value[0].toUpperCase() + value.slice(1),
  useAdminResources: () => ({ data: resources, isLoading: false, isError: false, refetch: vi.fn() }),
  useToggleResourceStatus: () => ({ mutate, isPending: false }),
  useDuplicateResource: () => ({ mutate, isPending: false }),
  useDeleteResource: () => ({ mutate, isPending: false }),
}));

describe("dashboard-style content management", () => {
  beforeEach(() => mutate.mockReset());

  it("turns the blog roster into an editorial publishing desk", () => {
    render(<MemoryRouter><AdminBlog /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Blog" })).toBeInTheDocument();
    expect(screen.queryByText("Content studio")).not.toBeInTheDocument();
    expect(screen.getByText("Published stories")).toBeInTheDocument();
    expect(screen.getByText("4,280")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search posts by title" })).toBeInTheDocument();
  });

  it("turns resources into a visual library without losing search", () => {
    render(<MemoryRouter><AdminResources /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Resources" })).toBeInTheDocument();
    expect(screen.queryByText("Resource library")).not.toBeInTheDocument();
    expect(screen.getByText("Total downloads")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Page summary" })).getByText("320")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search resources by title" })).toBeInTheDocument();
  });
});
