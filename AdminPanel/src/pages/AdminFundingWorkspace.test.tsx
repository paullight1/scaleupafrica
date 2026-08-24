// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AdminFundingEngine from "./AdminFundingEngine";
import AdminFundingWorkspace from "./AdminFundingWorkspace";

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
  it("keeps all funding operations in one tabbed workspace", () => {
    renderWorkspace("/admin/funding/sources");

    expect(screen.getByRole("heading", { name: "Funding" })).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "Funding sections" });
    expect(navigation).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Opportunities" })).toHaveAttribute("href", "/admin/funding");
    expect(screen.getByRole("link", { name: "Source Health" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Funding Engine" })).toBeInTheDocument();
    expect(screen.getByText("Source health management")).toBeInTheDocument();
  });

  it("leaves the funding engine section blank", () => {
    renderWorkspace("/admin/funding/engine");

    expect(screen.getByRole("link", { name: "Funding Engine" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("Opportunity management")).not.toBeInTheDocument();
    expect(screen.queryByText("Source health management")).not.toBeInTheDocument();
    expect(screen.queryByText("Report management")).not.toBeInTheDocument();
  });
});
