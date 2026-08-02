// Separate file: vi.mock hoists per-file, and this one stubs the blog query.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Insights from "@/components/landing/Insights";

const query = vi.hoisted(() => ({
  data: [] as unknown[],
  isPending: false,
  isError: false,
  refetch: vi.fn(),
}));
vi.mock("@/hooks/queries/blog", () => ({ useLatestPosts: () => query }));

const wrap = () =>
  render(
    <MemoryRouter>
      <Insights />
    </MemoryRouter>,
  );

const post = {
  id: "b1",
  title: "How to read a grant call",
  slug: "grant-call",
  excerpt: "What funders actually mean.",
  cover_image_url: null,
  category: "Funding",
  tags: [],
  read_time_min: 6,
  author_name: "Cresciva",
  published_at: "2026-07-01T00:00:00.000Z",
  featured: false,
};

describe("Insights", () => {
  beforeEach(() => {
    query.data = [];
    query.isPending = false;
    query.isError = false;
    query.refetch.mockClear();
  });

  it("shows skeletons while loading", () => {
    query.isPending = true;
    wrap();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("offers a retry on error instead of hiding the section", () => {
    query.isError = true;
    wrap();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("shows an illustrated empty state when nothing is published", () => {
    const { container } = wrap();
    expect(container.querySelector("svg")).toBeTruthy();
    expect(screen.getByText(/no posts yet/i)).toBeInTheDocument();
  });

  it("renders the posts when they load", () => {
    query.data = [post];
    wrap();
    expect(screen.getByText("How to read a grant call")).toBeInTheDocument();
  });
});
