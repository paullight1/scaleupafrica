// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { FundingProfilePrompt } from "./FundingProfilePrompt";

const complete = {
  country: "Nigeria",
  sector: "Agritech",
  businessStage: "growth",
  preferredFundingTypes: ["grant"],
  fundingTargetUsd: 100000,
  applicationReadiness: "ready",
};

describe("FundingProfilePrompt", () => {
  it("shows only the missing eligibility fields", () => {
    render(<MemoryRouter><FundingProfilePrompt profile={{ ...complete, country: null, businessStage: null }} /></MemoryRouter>);
    expect(screen.getByText(/Add your country/i)).toBeInTheDocument();
    expect(screen.getByText(/Add business stage/i)).toBeInTheDocument();
    expect(screen.queryByText(/Add preferred funding types/i)).toBeNull();
  });

  it("links missing fields to the matching profile section", () => {
    render(<MemoryRouter><FundingProfilePrompt profile={{ ...complete, businessStage: null }} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Add business stage/i })).toHaveAttribute("href", "/dashboard/profile/edit?section=matching");
  });

  it("renders nothing when the funding profile is complete", () => {
    const { container } = render(<MemoryRouter><FundingProfilePrompt profile={complete} /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
});