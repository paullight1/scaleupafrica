import type { ReactNode } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Index from "@/pages/Index";
import { HOMEPAGE_FAQS } from "@/content/faqs";

const auth = vi.hoisted(() => ({ user: null as unknown, loading: false }));
vi.mock("@shared/hooks/useAuth", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/useViewerState", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useViewerState")>(
    "@/hooks/useViewerState",
  );
  return { ...actual, useViewerState: () => "anonymous" };
});
vi.mock("@/hooks/queries/blog", () => ({
  useLatestPosts: () => ({ data: [], isPending: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/hooks/queries/directory", () => ({
  useDirectorySearch: () => ({ data: { pages: [{ rows: [] }] }, isLoading: false }),
}));
vi.mock("@/components/NewsletterSignup", () => ({ default: () => <div /> }));
vi.mock("@/components/billing/CheckoutButton", () => ({
  CheckoutButton: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

const wrap = () =>
  render(
    <MemoryRouter>
      <Index />
    </MemoryRouter>,
  );

describe("landing page", () => {
  beforeEach(() => {
    auth.user = null;
    auth.loading = false;
  });

  it("renders exactly one h1", () => {
    wrap();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("keeps the pricing and faq anchors other pages link to", () => {
    const { container } = wrap();
    expect(container.querySelector("#pricing")).toBeTruthy();
    expect(container.querySelector("#faq")).toBeTruthy();
  });

  it("shows five FAQs and a link to the rest", () => {
    wrap();
    for (const faq of HOMEPAGE_FAQS) {
      expect(screen.getByText(faq.question)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /see all questions/i })).toHaveAttribute(
      "href",
      "/faq",
    );
  });

  it("no longer carries the pre-pricing warning block", () => {
    wrap();
    expect(screen.queryByText("Important Disclaimer")).not.toBeInTheDocument();
  });

  it("links to the disclaimer from both the pricing fine print and reassurance", () => {
    wrap();
    const links = screen.getAllByRole("link", { name: /read the full disclaimer/i });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/disclaimer");
    }
  });

  it("ships no invented stats or testimonials", () => {
    const { container } = wrap();
    expect(container.querySelector("figure")).toBeNull();
    expect(container.querySelector("dl")).toBeNull();
  });

  it("leads every major section with a visual", () => {
    const { container } = wrap();
    // Twelve sections, each illustration-first or product-preview-first.
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(10);
  });
});
