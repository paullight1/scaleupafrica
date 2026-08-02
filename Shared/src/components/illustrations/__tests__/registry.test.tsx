import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { illustrationRegistry } from "@shared/components/illustrations";

const NAMES = Object.keys(illustrationRegistry) as (keyof typeof illustrationRegistry)[];

const LANDING_NAMES = [
  "hero-growth",
  "problem-invisible",
  "problem-scattered",
  "problem-time",
  "profile-incomplete",
  "step-list",
  "step-discovered",
  "step-funding",
  "reassurance-does",
  "reassurance-doesnt",
  "locked-vault",
  "empty-insights",
  "cta-launch",
] as const;

describe("illustration registry", () => {
  it("registers every landing illustration", () => {
    for (const name of LANDING_NAMES) {
      expect(illustrationRegistry).toHaveProperty(name);
    }
  });

  it.each(NAMES)("%s is a decorative svg with a viewBox", (name) => {
    const Svg = illustrationRegistry[name];
    const { container } = render(<Svg />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("viewBox");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("width");
  });

  it.each(NAMES)("%s uses design tokens, never literal hex", (name) => {
    const Svg = illustrationRegistry[name];
    const { container } = render(<Svg />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("cta-launch fills against the dark band, not the light surface", () => {
    const CtaLaunch = illustrationRegistry["cta-launch"];
    const { container } = render(<CtaLaunch />);
    // It sits on --mk-canvas, where --surface-muted would be near-white.
    expect(container.innerHTML).not.toContain("--surface-muted");
    expect(container.innerHTML).toContain("--mk-raised");
  });
});
