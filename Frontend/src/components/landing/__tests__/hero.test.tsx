import type { ReactNode } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import ViewerBand from "@/components/landing/ViewerBand";

const viewer = vi.hoisted(() => ({ kind: "anonymous" as string }));
vi.mock("@/hooks/useViewerState", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useViewerState")>(
    "@/hooks/useViewerState",
  );
  return { ...actual, useViewerState: () => viewer.kind };
});

const wrap = (ui: ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("Hero", () => {
  beforeEach(() => {
    viewer.kind = "anonymous";
  });

  it("leads with the headline and both CTAs for a stranger", () => {
    wrap(<Hero />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Scale Your Business/i);
    expect(screen.getByRole("link", { name: /List your business — free/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See how funding works" })).toBeInTheDocument();
  });

  it("adapts the CTA for a member", () => {
    viewer.kind = "member";
    wrap(<Hero />);
    expect(screen.getByRole("link", { name: /Go to dashboard/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /List your business — free/ }),
    ).not.toBeInTheDocument();
  });

  it("carries an illustration", () => {
    const { container } = wrap(<Hero />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

describe("Problem", () => {
  it("renders three illustrated cards, illustration first", () => {
    const { container } = wrap(<Problem />);
    const cards = container.querySelectorAll("article");
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card.firstElementChild?.querySelector("svg")).toBeTruthy();
    }
  });
});

describe("ViewerBand", () => {
  it("renders nothing for a stranger", () => {
    viewer.kind = "anonymous";
    const { container } = wrap(<ViewerBand />);
    expect(container).toBeEmptyDOMElement();
  });

  it("nudges a signed-in user with no listing", () => {
    viewer.kind = "no-profile";
    wrap(<ViewerBand />);
    expect(screen.getByRole("link", { name: /Finish your listing/ })).toBeInTheDocument();
  });
});
