// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { Newspaper } from "lucide-react";
import { describe, expect, it } from "vitest";
import { StudioAvatar } from "./StudioAvatar";
import { StudioMetricStrip } from "./StudioMetricStrip";
import { StudioPageHeader } from "./StudioPageHeader";

describe("Cresciva Studio primitives", () => {
  it("gives every admin desk an editorial but accessible page introduction", () => {
    render(
      <StudioPageHeader
        eyebrow="Content studio"
        title="Stories worth sharing"
        description="Manage the publishing desk."
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Stories worth sharing" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Content studio")).toBeInTheDocument();
    expect(screen.getByText("Manage the publishing desk.")).toBeInTheDocument();
  });

  it("keeps metric meaning visible instead of relying on accent color", () => {
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

    expect(screen.getByText("Published")).toBeInTheDocument();
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
