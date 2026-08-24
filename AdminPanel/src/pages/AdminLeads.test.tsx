// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminLeads from "./AdminLeads";

const rows = [
  {
    id: "lead-1",
    name: "Amara Okafor",
    email: "amara@example.com",
    company: "Kite Ltd",
    message: "Funding guidance",
    source: "contact",
    resource_id: null,
    status: "new",
    metadata: { support_area: "funding_support", business_sector: "Technology & Software" },
    created_at: "2026-08-24T10:00:00Z",
  },
  {
    id: "lead-2",
    name: "Bola Adeyemi",
    email: "bola@example.com",
    company: null,
    message: "Partnership proposal",
    source: "contact",
    resource_id: null,
    status: "contacted",
    metadata: { support_area: "partnerships", business_sector: "Manufacturing" },
    created_at: "2026-08-23T10:00:00Z",
  },
  {
    id: "lead-3",
    name: null,
    email: "reader@example.com",
    company: null,
    message: null,
    source: "resource_download",
    resource_id: "resource-1",
    status: "archived",
    metadata: { resource_title: "Pitch deck guide" },
    created_at: "2026-08-22T10:00:00Z",
  },
];

vi.mock("@/hooks/queries/adminOps", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/queries/adminOps")>("@/hooks/queries/adminOps");
  return {
    ...actual,
    useAdminLeads: () => ({ isLoading: false, isError: false, data: rows, refetch: vi.fn() }),
    useUpdateLeadStatus: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

describe("Admin support inbox", () => {
  it("summarizes the workflow and shows inquiry classifications", () => {
    render(
      <MemoryRouter>
        <AdminLeads />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Support inbox" })).toBeInTheDocument();
    expect(screen.getByText("New inquiries")).toBeInTheDocument();
    expect(screen.getAllByText("In progress").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Resolved").length).toBeGreaterThan(0);
    expect(screen.getByText("Total inquiries")).toBeInTheDocument();
    expect(screen.getByText("Funding support")).toBeInTheDocument();
    expect(screen.getByText("Technology & Software")).toBeInTheDocument();
    expect(screen.getByText("Resources")).toBeInTheDocument();
  });
});
