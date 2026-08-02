import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Section, Eyebrow, SectionHeading, Reveal } from "@shared/components/marketing";

describe("Section", () => {
  it("defaults to the light tone", () => {
    const { container } = render(<Section>body</Section>);
    expect(container.querySelector("section")).toHaveClass("bg-background");
  });

  it("applies the tinted and dark tones", () => {
    const { container: tinted } = render(<Section tone="tinted">body</Section>);
    expect(tinted.querySelector("section")).toHaveClass("bg-surface-subtle");
    const { container: dark } = render(<Section tone="dark">body</Section>);
    expect(dark.querySelector("section")).toHaveClass("bg-mk-canvas");
  });

  it("forwards an id so existing anchors keep working", () => {
    const { container } = render(<Section id="pricing">body</Section>);
    expect(container.querySelector("section")).toHaveAttribute("id", "pricing");
  });
});

describe("Eyebrow", () => {
  it("is navy on light, because small orange text fails AA on white", () => {
    render(<Eyebrow>Why now</Eyebrow>);
    expect(screen.getByText("Why now")).toHaveClass("text-navy");
  });

  it("is orange on dark, where it clears AA at 6.66:1", () => {
    render(<Eyebrow tone="dark">Why now</Eyebrow>);
    expect(screen.getByText("Why now")).toHaveClass("text-primary");
  });
});

describe("SectionHeading", () => {
  it("renders a level-2 heading with its lead and eyebrow", () => {
    render(
      <SectionHeading eyebrow="Step one" title="List your business" lead="Takes minutes." />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "List your business" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Step one")).toBeInTheDocument();
    expect(screen.getByText("Takes minutes.")).toBeInTheDocument();
  });

  it("omits the eyebrow and lead when not given", () => {
    const { container } = render(<SectionHeading title="Solo" />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });
});

describe("Reveal", () => {
  it("renders its children and carries the transition delay", () => {
    render(<Reveal delay={160}>content</Reveal>);
    const el = screen.getByText("content");
    expect(el).toHaveStyle({ transitionDelay: "160ms" });
  });
});
