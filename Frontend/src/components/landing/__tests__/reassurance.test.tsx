import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Reassurance from "@/components/landing/Reassurance";
import ClosingCTA from "@/components/landing/ClosingCTA";
import { REASSURANCE_DOES, REASSURANCE_DOESNT } from "@/content/homepage";

vi.mock("@/components/NewsletterSignup", () => ({ default: () => <div /> }));
vi.mock("@/hooks/useViewerState", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useViewerState")>(
    "@/hooks/useViewerState",
  );
  return { ...actual, useViewerState: () => "anonymous" };
});

const wrap = (ui: ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("Reassurance", () => {
  it("renders both columns in full", () => {
    wrap(<Reassurance />);
    for (const line of [...REASSURANCE_DOES, ...REASSURANCE_DOESNT]) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
  });

  it("is neutral — no alarm colour anywhere in the 'doesn't' column", () => {
    const { container } = wrap(<Reassurance />);
    expect(container.innerHTML).not.toMatch(/destructive|text-red|bg-amber|text-warning/);
  });

  it("links to the full disclaimer as plain text, not a button", () => {
    wrap(<Reassurance />);
    const link = screen.getByRole("link", { name: /read the full disclaimer/i });
    expect(link).toHaveAttribute("href", "/disclaimer");
    expect(link.className).not.toMatch(/bg-primary/);
  });
});

describe("ClosingCTA", () => {
  it("offers both actions", () => {
    wrap(<ClosingCTA />);
    expect(screen.getByRole("link", { name: /list your business/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see membership/i })).toBeInTheDocument();
  });
});
