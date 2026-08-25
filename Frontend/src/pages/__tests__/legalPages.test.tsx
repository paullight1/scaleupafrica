import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Disclaimer from "@/pages/Disclaimer";
import FAQPage from "@/pages/FAQ";
import { AppFooter } from "@/components/common/AppFooter";
import { DISCLAIMER_POINTS } from "@/content/homepage";
import { FAQS } from "@/content/faqs";

vi.mock("@/components/NewsletterSignup", () => ({ default: () => <div /> }));

const wrap = (ui: ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("/disclaimer", () => {
  it("carries all five points verbatim", () => {
    wrap(<Disclaimer />);
    for (const point of DISCLAIMER_POINTS) {
      expect(screen.getByText(point.title)).toBeInTheDocument();
      expect(screen.getByText(point.description)).toBeInTheDocument();
    }
  });
});

describe("/faq", () => {
  it("renders every question, not just the homepage five", () => {
    wrap(<FAQPage />);
    for (const faq of FAQS) {
      expect(screen.getByText(faq.question)).toBeInTheDocument();
    }
  });
});

describe("footer", () => {
  it("links to the disclaimer from the Legal column", () => {
    wrap(<AppFooter />);
    expect(screen.getByRole("link", { name: "Disclaimer" })).toHaveAttribute(
      "href",
      "/disclaimer",
    );
  });

  it("links to the full FAQ", () => {
    wrap(<AppFooter />);
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/faq");
  });

  it("provides a compact set of essential mobile footer links", () => {
    wrap(<AppFooter />);

    const essentials = screen.getByRole("navigation", { name: "Footer essentials" });
    expect(essentials).toHaveTextContent("Contact");
    expect(essentials).toHaveTextContent("Privacy");
    expect(essentials).toHaveTextContent("Terms");
  });
});
