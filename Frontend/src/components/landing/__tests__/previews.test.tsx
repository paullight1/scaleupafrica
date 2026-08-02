import type { ReactNode } from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HowItWorks from "@/components/landing/HowItWorks";
import DirectoryPreview from "@/components/landing/DirectoryPreview";
import FundingPreview from "@/components/landing/FundingPreview";
import { SAMPLE_PROFILES } from "@/content/homepage";

const wrap = (ui: ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("HowItWorks", () => {
  it("renders three steps, each with an illustration", () => {
    const { container } = wrap(<HowItWorks />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(3);
  });
});

describe("DirectoryPreview", () => {
  it("shows the sample businesses", () => {
    wrap(<DirectoryPreview />);
    expect(screen.getByText(SAMPLE_PROFILES[0].business_name)).toBeInTheDocument();
  });

  it("keeps the preview inert — sample slugs are not real routes", () => {
    const { container } = wrap(<DirectoryPreview />);
    const stage = container.querySelector("[data-preview-stage]")!;
    expect(stage).toHaveAttribute("aria-hidden", "true");
    expect(stage).toHaveAttribute("inert");
  });

  it("offers one real link out", () => {
    wrap(<DirectoryPreview />);
    expect(screen.getByRole("link", { name: /browse the directory/i })).toHaveAttribute(
      "href",
      "/directory",
    );
  });
});

describe("FundingPreview", () => {
  it("shows one legible opportunity", () => {
    wrap(<FundingPreview />);
    expect(screen.getByText("Africa Agri-Processing Growth Fund")).toBeInTheDocument();
  });

  it("states the members-only limit honestly, with no fake blurred cards", () => {
    const { container } = wrap(<FundingPreview />);
    expect(screen.getByText(/members see the full curated list/i)).toBeInTheDocument();
    expect(container.querySelector(".blur-sm, .blur, .blur-md")).toBeNull();
  });
});
