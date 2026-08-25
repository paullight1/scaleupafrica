// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 240 }),
  };
});

const hookState = vi.hoisted(() => ({
  stats: {
    total_users: 128,
    new_users_7d: 12,
    active_subscriptions: 47,
    total_profiles: 36,
    new_profiles_7d: 4,
    published_resources: 18,
    total_resources: 20,
    published_posts: 24,
    total_posts: 27,
    newsletter_subs: 92,
    new_leads: 3,
    total_leads: 9,
    funding_searches_30d: 54,
    page_views_30d: 740,
    flagged_profiles: 1,
  },
  reporting: {
    periodDays: 30,
    audience: {
      page_views: 740,
      unique_sessions: 220,
      new_users: 64,
      funding_searches: 54,
    },
    content: {},
    revenue: {
      byCurrency: { NGN: 2500000 },
      byPlan: [],
      successfulPayments: 5,
      failedPayments: 1,
    },
    operations: {},
  },
  performance: [
    {
      contentId: "post-1",
      contentType: "blog",
      title: "A practical growth guide",
      status: "published",
      views: 42,
      downloads: 0,
      totalEngagement: 42,
    },
    {
      contentId: "resource-1",
      contentType: "resource",
      title: "Pitch deck checklist",
      status: "published",
      views: 18,
      downloads: 7,
      totalEngagement: 25,
    },
    {
      contentId: "post-2",
      contentType: "blog",
      title: "How founders build momentum",
      status: "published",
      views: 16,
      downloads: 0,
      totalEngagement: 16,
    },
    {
      contentId: "post-3",
      contentType: "blog",
      title: "A fourth result that stays behind the summary",
      status: "published",
      views: 12,
      downloads: 0,
      totalEngagement: 12,
    },
  ],
}));

const query = <T,>(data: T) => ({
  data,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
});

vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      email: "amaka@cresciva.com",
      user_metadata: { full_name: "Amaka Okafor" },
    },
  }),
}));

vi.mock("@/hooks/queries/adminDashboard", () => ({
  useAdminStats: () => query(hookState.stats),
  useAdminReportingSummary: () => query(hookState.reporting),
  useAdminContentPerformance: () => query(hookState.performance),
  useAdminTimeseries: (metric: string) =>
    query(metric === "signups" ? [{ day: "2026-08-24", count: 4 }] : []),
  useProfilesBySector: () => query([{ sector: "Fintech", count: 12 }]),
}));

import AdminDashboard from "./AdminDashboard";

describe("AdminDashboard", () => {
  it("greets the signed-in administrator and keeps the primary summary to four metrics", () => {
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: /good (morning|afternoon|evening), amaka/i })).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "Business summary" });
    expect(within(summary).getAllByRole("article")).toHaveLength(4);
    expect(within(summary).getByText("Total users")).toBeInTheDocument();
    expect(within(summary).queryByText("Newsletter subscribers")).not.toBeInTheDocument();
    expect(within(summary).queryByText("Funding searches (30d)")).not.toBeInTheDocument();
  });

  it("presents circular audience and publishing breakdowns", () => {
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

    expect(screen.getByRole("img", { name: "Audience mix: 64 new and 156 returning sessions" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Publishing mix: 24 blog posts and 18 resources" })).toBeInTheDocument();
  });

  it("identifies each content result with a useful content type", () => {
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

    const performance = screen.getByRole("region", { name: "Content performance" });
    expect(within(performance).getByText("A practical growth guide")).toBeInTheDocument();
    expect(within(performance).getAllByText("Blog post").length).toBeGreaterThan(0);
    expect(within(performance).getByText("Resource")).toBeInTheDocument();
    const blogRow = within(performance).getByText("A practical growth guide").closest("li");
    expect(blogRow).not.toBeNull();
    expect(within(blogRow!).getByRole("img", { name: "Blog post icon" })).toBeInTheDocument();
  });

  it("keeps content performance compact beside the at-a-glance summary", () => {
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

    const insights = screen.getByRole("region", { name: "Dashboard insights" });
    expect(insights).toHaveClass("xl:grid-cols-2");
    const performance = screen.getByRole("region", { name: "Content performance" });
    expect(within(performance).getAllByRole("listitem")).toHaveLength(3);
    expect(within(performance).queryByText("A fourth result that stays behind the summary")).not.toBeInTheDocument();
  });
});
