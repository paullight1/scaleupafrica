// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminLayout from "./AdminLayout";

vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      email: "admin@cresciva.com",
      user_metadata: { full_name: "Amaka Okafor" },
    },
    signOut: vi.fn(),
  }),
}));

vi.mock("@shared/hooks/useRole", () => ({
  useRole: () => ({ isAdmin: true }),
}));

describe("AdminLayout funding navigation", () => {
  it("keeps the studio shell visible while the next route is loading", () => {
    const pendingRoute = new Promise<never>(() => undefined);
    const SuspendedRoute = () => {
      throw pendingRoute;
    };

    render(
      <MemoryRouter initialEntries={["/admin/blog"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="blog" element={<SuspendedRoute />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation", { name: "Admin navigation" })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass("studio-canvas");
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows one active Funding entry for every funding subsection", () => {
    render(
      <MemoryRouter initialEntries={["/admin/funding/reports"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="funding/reports" element={<p>Funding report content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const fundingLinks = screen.getAllByRole("link", { name: "Funding" });
    expect(fundingLinks).toHaveLength(1);
    expect(fundingLinks[0]).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Funding source health" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Funding reports" })).not.toBeInTheDocument();
  });

  it("names the customer follow-up area Inbox rather than Leads", () => {
    render(
      <MemoryRouter initialEntries={["/admin/leads"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="leads" element={<p>Inbox content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Inbox" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Leads" })).not.toBeInTheDocument();
  });

  it("filters the desktop navigation from the sidebar search", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<p>Dashboard content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Search navigation" }), {
      target: { value: "pay" },
    });

    expect(screen.getByRole("link", { name: "Payments" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Inbox" })).not.toBeInTheDocument();
  });

  it("shows the signed-in administrator as a profile control", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<p>Dashboard content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("button", { name: "Open profile menu for Amaka Okafor" }),
    ).toBeInTheDocument();
    expect(screen.getByText("AO")).toBeInTheDocument();
  });

  it("places admin routes inside the studio canvas without replacing navigation", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<p>Dashboard content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(document.querySelector(".admin-studio")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass("studio-canvas");
    expect(
      screen.getByRole("navigation", { name: "Admin navigation" }),
    ).toBeInTheDocument();
  });
});
