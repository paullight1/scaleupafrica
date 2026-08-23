// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

const queries = vi.hoisted(() => ({ useFundingFeed: vi.fn(() => ({ data: [] })) }));

vi.mock("@/hooks/queries/dashboard", () => ({ useFundingFeed: queries.useFundingFeed }));
vi.mock("@shared/components/common/SEO", () => ({ SEO: () => null }));
vi.mock("@/components/dashboard/DashboardNav", () => ({ DashboardNav: () => <nav>Dashboard navigation</nav> }));
vi.mock("@/components/dashboard/DashboardMobileNav", () => ({ DashboardMobileNav: () => null }));
vi.mock("./DashboardHome", () => ({ default: () => <div>Home page</div> }));
vi.mock("./DashboardFunding", () => ({ default: () => <div>Funding page</div> }));
vi.mock("./DashboardProfile", () => ({ default: () => <div>Profile page</div> }));
vi.mock("./DashboardAccount", () => ({ default: () => <div>Membership page</div> }));

describe("Dashboard shell", () => {
  it("does not fetch the paid funding feed just to render an account route", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/account/membership"]}>
        <Routes>
          <Route path="/dashboard/*" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Membership page")).toBeInTheDocument();
    expect(queries.useFundingFeed).not.toHaveBeenCalled();
  });
});
