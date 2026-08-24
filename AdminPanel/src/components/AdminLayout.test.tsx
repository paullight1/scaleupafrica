// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminLayout from "./AdminLayout";

vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "admin@cresciva.com" }, signOut: vi.fn() }),
}));

vi.mock("@shared/hooks/useRole", () => ({
  useRole: () => ({ isAdmin: true }),
}));

describe("AdminLayout funding navigation", () => {
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
});
