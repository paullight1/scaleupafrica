// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { Newspaper } from "lucide-react";
import { describe, expect, it } from "vitest";
import { StudioAvatar } from "./StudioAvatar";
import { StudioMetricStrip } from "./StudioMetricStrip";
import { StudioPageHeader } from "./StudioPageHeader";

describe("dashboard-style admin primitives", () => {
  it("uses the same restrained page introduction as the member dashboard", () => {
    render(
      <StudioPageHeader
        eyebrow="Content studio"
        title="Blog"
        description="Manage the publishing desk."
      />,
    );

    expect(screen.getByRole("heading", { name: "Blog" })).toHaveClass(
      "text-3xl",
      "text-ink-strong",
    );
    expect(screen.queryByText("Content studio")).not.toBeInTheDocument();
    expect(screen.getByText("Manage the publishing desk.")).toBeInTheDocument();
  });

  it("renders summary metrics as neutral dashboard cards", () => {
    render(
      <StudioMetricStrip
        items={[
          {
            label: "Published",
            value: 12,
            hint: "Ready for readers",
            icon: Newspaper,
            tone: "cobalt",
          },
        ]}
      />,
    );

    expect(screen.getByText("Published").closest("article")).toHaveClass(
      "bg-card",
      "shadow-soft",
    );
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Ready for readers")).toBeInTheDocument();
  });

  it("derives a compact identity when no profile image exists", () => {
    const { rerender } = render(<StudioAvatar name="Amaka Okafor" />);
    expect(screen.getByText("AO")).toBeInTheDocument();

    rerender(<StudioAvatar name="Cresciva" />);
    expect(screen.getByText("C")).toBeInTheDocument();
  });
});
