import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("EmptyState", () => {
  it("renders title and description", () => {
    wrap(<EmptyState title="No results" description="Try again later." />);
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("Try again later.")).toBeInTheDocument();
  });

  it("renders a link when action.to is set", () => {
    wrap(<EmptyState title="Empty" action={{ label: "Go home", to: "/" }} />);
    const link = screen.getByRole("link", { name: "Go home" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("fires action.onClick", () => {
    const onClick = vi.fn();
    wrap(<EmptyState title="Empty" action={{ label: "Reset", onClick }} />);
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("search variant exposes role=status", () => {
    const { container } = wrap(<EmptyState variant="search" title="No matches" />);
    expect(container.querySelector('[role="status"]')).toBeTruthy();
  });
});
