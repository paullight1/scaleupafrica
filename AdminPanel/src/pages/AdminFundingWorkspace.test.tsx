// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminFundingEngine from "./AdminFundingEngine";
import AdminFundingWorkspace from "./AdminFundingWorkspace";

vi.mock("@/hooks/queries/fundingEngine", () => ({
  useFundingEngineStatus: () => ({ data: { database: { reachable: true }, ai: { enabled: true }, runtime: { version: "2.0" } }, isLoading: false, isError: false, refetch: vi.fn() }),
  useFundingEngineSources: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useFundingEngineRuns: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useFundingEngineOpportunities: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useStartFundingEngineRun: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderWorkspace(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/funding" element={<AdminFundingWorkspace />}>
          <Route index element={<p>Opportunity management</p>} />
          <Route path="sources" element={<p>Source health management</p>} />
          <Route path="reports" element={<p>Report management</p>} />
          <Route path="engine" element={<AdminFundingEngine />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminFundingWorkspace", () => {
  beforeEach(() => window.localStorage.clear());

  it("keeps all funding operations in one tabbed workspace", () => {
    renderWorkspace("/admin/funding/sources");

    const navigation = screen.getByRole("navigation", { name: "Funding sections" });
    expect(navigation).toHaveClass("bg-card", "shadow-soft");
    expect(screen.queryByText("Funding workspace")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Opportunities" })).toHaveAttribute("href", "/admin/funding");
    expect(screen.getByRole("link", { name: "Source Health" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Funding Engine" })).toBeInTheDocument();
    expect(screen.getByText("Source health management")).toBeInTheDocument();
  });

  it("renders the connected funding engine workspace", async () => {
    renderWorkspace("/admin/funding/engine");

    const guide = await screen.findByRole("dialog", {
      name: "How Cresciva grant discovery works",
    });
    expect(guide).toHaveTextContent("Cresciva talks to the Edutu Engine API");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(guide).toHaveTextContent("Choose where Edutu should search");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(guide).toHaveTextContent("Only grant-tagged results return");
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));

    expect(screen.getByRole("link", { name: "Funding Engine" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("Opportunity management")).not.toBeInTheDocument();
    expect(screen.queryByText("Source health management")).not.toBeInTheDocument();
    expect(screen.queryByText("Report management")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Opportunity engine" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start run" })).toBeInTheDocument();
    expect(screen.getByText("Connected to the Edutu Engine API")).toBeInTheDocument();
    expect(screen.getByText("Grants only")).toBeInTheDocument();
  });
});
