import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "@shared/components/common/StatCard";

describe("StatCard", () => {
  it("renders value and label", () => {
    render(<StatCard label="Members" value={42} />);
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("applies delta direction color for up", () => {
    render(<StatCard label="Growth" value="12%" delta={{ value: "3%", direction: "up" }} />);
    const delta = screen.getByText("3%");
    expect(delta.className).toContain("text-success-strong");
  });

  it("applies delta direction color for down", () => {
    render(<StatCard label="Churn" value="2%" delta={{ value: "1%", direction: "down" }} />);
    expect(screen.getByText("1%").className).toContain("text-destructive-strong");
  });

  it("renders a skeleton instead of the value when loading", () => {
    const { container } = render(<StatCard label="Loading" value={99} loading />);
    expect(screen.queryByText("99")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });
});
