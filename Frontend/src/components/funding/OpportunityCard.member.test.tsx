// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OpportunityCard } from "./OpportunityCard";
import { parseOpportunities } from "@/lib/fundingSchema";

const [opportunity] = parseOpportunities([{
  title: "Growth Grant",
  funder: "Example Funder",
  url: "https://example.org/program",
  application_url: "https://example.org/apply",
}]);

describe("OpportunityCard member workflow", () => {
  it("shows deterministic eligibility separately from match score", () => {
    render(<OpportunityCard opportunity={opportunity} open={false} onToggle={() => {}} eligibilityStatus="eligible" matchScore={91} />);
    expect(screen.getByText(/^Eligible$/i)).toBeInTheDocument();
    expect(screen.getByText("91% match")).toBeInTheDocument();
  });

  it("shows missing eligibility information instead of implying eligibility", () => {
    render(<OpportunityCard opportunity={opportunity} open={false} onToggle={() => {}} eligibilityStatus="insufficient_information" missingInformation={["Add your operating country to confirm geographic eligibility."]} />);
    expect(screen.getByText(/needs information/i)).toBeInTheDocument();
    expect(screen.getByText(/Add your operating country/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Eligible$/i)).toBeNull();
  });

  it("offers apply only when primary gate is passed", () => {
    const { rerender } = render(<OpportunityCard opportunity={opportunity} open={false} onToggle={() => {}} opportunityId="00000000-0000-4000-8000-000000000001" verificationStatus="verified" applicationStatus="open" applicationUrl="https://example.org/apply" eligibilityStatus="eligible" primaryApplyEligible />);
    expect(screen.getByRole("link", { name: /apply on official site/i })).toBeInTheDocument();
    rerender(<OpportunityCard opportunity={opportunity} open={false} onToggle={() => {}} verificationStatus="verified" applicationStatus="unknown" applicationUrl="https://example.org/apply" eligibilityStatus="eligible" primaryApplyEligible={false} />);
    expect(screen.queryByRole("link", { name: /apply on official site/i })).toBeNull();
  });

  it("emits saved, preparing, applied and dismissed member-local state changes", () => {
    const onChange = vi.fn();
    render(<OpportunityCard opportunity={opportunity} opportunityId="00000000-0000-4000-8000-000000000001" open={false} onToggle={() => {}} eligibilityStatus="eligible" memberState={null} onMemberStateChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));
    fireEvent.click(screen.getByRole("button", { name: /I'm preparing/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Applied$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Not relevant/i }));
    expect(onChange).toHaveBeenNthCalledWith(1, "saved");
    expect(onChange).toHaveBeenNthCalledWith(2, "preparing");
    expect(onChange).toHaveBeenNthCalledWith(3, "applied");
    expect(onChange).toHaveBeenNthCalledWith(4, "dismissed");
  });

  it("offers outcome controls only after an application has been marked applied", () => {
    const onChange = vi.fn();
    const opportunityId = "00000000-0000-4000-8000-000000000001";
    const { rerender } = render(<OpportunityCard opportunity={opportunity} opportunityId={opportunityId} open={false} onToggle={() => {}} memberState="saved" onMemberStateChange={onChange} />);
    expect(screen.queryByRole("button", { name: /^Won$/i })).toBeNull();
    rerender(<OpportunityCard opportunity={opportunity} opportunityId={opportunityId} open={false} onToggle={() => {}} memberState="applied" onMemberStateChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /^Won$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Rejected$/i }));
    expect(onChange).toHaveBeenCalledWith("won");
    expect(onChange).toHaveBeenCalledWith("rejected");
  });
});
