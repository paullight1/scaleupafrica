import type { ReactNode } from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  IllustratedCard,
  SplitRow,
  BrowserFrame,
  CTABand,
  StatBand,
  Testimonials,
} from "@shared/components/marketing";

const wrap = (ui: ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("IllustratedCard", () => {
  it("leads with the illustration, then the title", () => {
    const { container } = wrap(
      <IllustratedCard illustration="empty-search" title="Hard to find">
        body copy
      </IllustratedCard>,
    );
    const card = container.querySelector("article")!;
    expect(card.firstElementChild?.querySelector("svg")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Hard to find" })).toBeInTheDocument();
    expect(screen.getByText("body copy")).toBeInTheDocument();
  });
});

describe("SplitRow", () => {
  it("reverses the column order without reordering the DOM", () => {
    const { container } = wrap(
      <SplitRow illustration="first-run" reverse>
        copy
      </SplitRow>,
    );
    // Copy stays first in the DOM for screen readers; CSS does the swapping.
    expect(container.querySelector(".md\\:order-2")).toBeTruthy();
  });
});

describe("BrowserFrame", () => {
  it("marks its contents inert and hidden, because previews are not real links", () => {
    const { container } = wrap(
      <BrowserFrame>
        <a href="/somewhere">Not clickable</a>
      </BrowserFrame>,
    );
    const stage = container.querySelector("[data-preview-stage]")!;
    expect(stage).toHaveAttribute("aria-hidden", "true");
    expect(stage).toHaveAttribute("inert");
  });
});

describe("StatBand", () => {
  it("renders nothing when there are no stats", () => {
    const { container } = wrap(<StatBand stats={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each stat when they exist", () => {
    wrap(<StatBand stats={[{ value: "20+", label: "Markets" }]} />);
    expect(screen.getByText("20+")).toBeInTheDocument();
    expect(screen.getByText("Markets")).toBeInTheDocument();
  });
});

describe("Testimonials", () => {
  it("renders nothing when there are none", () => {
    const { container } = wrap(<Testimonials items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a quote with its attribution", () => {
    wrap(<Testimonials items={[{ quote: "It worked.", name: "Ada", role: "Founder" }]} />);
    expect(screen.getByText(/It worked\./)).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Founder")).toBeInTheDocument();
  });
});

describe("CTABand", () => {
  it("renders both actions as links", () => {
    wrap(
      <CTABand
        title="Ready?"
        primary={{ label: "List your business", to: "/directory/create" }}
        secondary={{ label: "See membership", to: "/#pricing" }}
      />,
    );
    expect(screen.getByRole("link", { name: "List your business" })).toHaveAttribute(
      "href",
      "/directory/create",
    );
    expect(screen.getByRole("link", { name: "See membership" })).toBeInTheDocument();
  });
});
