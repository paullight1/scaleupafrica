import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingState, TableSkeleton } from "@shared/components/common/LoadingState";

describe("LoadingState", () => {
  it("exposes role=status with an sr-only label", () => {
    render(<LoadingState />);
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("TableSkeleton renders rows × columns cells (plus header row)", () => {
    const { container } = render(<TableSkeleton rows={3} columns={4} />);
    // 3 body rows + 1 header row = 4 rows, each with 4 skeleton cells = 16 bones.
    const bones = container.querySelectorAll(".animate-pulse");
    expect(bones.length).toBe(16);
  });
});
