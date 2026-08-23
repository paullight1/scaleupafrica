import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OpportunityCard } from "@/components/funding/OpportunityCard";
import { parseOpportunities, type Opportunity } from "@/lib/fundingSchema";

const [opA] = parseOpportunities([{ title: "Alpha Grant", funder: "Alpha Org", url: "https://alpha.example", funder_about: "About Alpha org." }]);
const [opB] = parseOpportunities([{ title: "Beta Grant", funder: "Beta Org", url: "https://beta.example", funder_about: "About Beta org." }]);
const [opNoUrl] = parseOpportunities([{ title: "Gamma Grant", funder: "Gamma Org", url: "javascript:alert(1)", funder_about: "About Gamma org." }]);

function MultiHarness({ opps }: { opps: Opportunity[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setOpen((prev) => { const next = new Set(prev); if (next.has(k)) next.delete(k); else next.add(k); return next; });
  return <>{opps.map((o) => <OpportunityCard key={o.title} opportunity={o} open={open.has(o.title)} onToggle={() => toggle(o.title)} />)}</>;
}

describe("OpportunityCard", () => {
  it("keeps multiple cards open at once", () => {
    render(<MultiHarness opps={[opA, opB]} />);
    const buttons = screen.getAllByRole("button", { name: /learn more/i });
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    expect(screen.getByText("About Alpha org.")).toBeInTheDocument();
    expect(screen.getByText("About Beta org.")).toBeInTheDocument();
  });

  it("renders no official-source link when the url is null", () => {
    render(<OpportunityCard opportunity={opNoUrl} open onToggle={() => {}} />);
    expect(opNoUrl.url).toBeNull();
    expect(screen.queryByRole("link", { name: /official source/i })).toBeNull();
  });

  it("toggles aria-expanded", () => {
    render(<MultiHarness opps={[opA]} />);
    const btn = screen.getByRole("button", { name: /learn more/i });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: /show less/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the official source visible while the card is collapsed", () => {
    render(<OpportunityCard opportunity={opA} open={false} onToggle={() => {}} />);
    expect(screen.getByRole("link", { name: /official source/i })).toHaveAttribute("href", "https://alpha.example/");
  });

  it("renders match evidence and verified trust state", () => {
    render(<OpportunityCard opportunity={opA} open={false} onToggle={() => {}} matchScore={92} confidenceScore={94} matchReasons={["Nigeria is in the eligible geography.", "Agritech aligns with this program's focus."]} verificationStatus="verified" lastVerifiedAt="2026-08-20T00:00:00Z" />);
    expect(screen.getByText("92% match")).toBeInTheDocument();
    expect(screen.getByText(/verified source/i)).toBeInTheDocument();
    expect(screen.getByText(/why it matches/i)).toBeInTheDocument();
    expect(screen.getByText(/Nigeria is in the eligible geography/i)).toBeInTheDocument();
  });

  it("does not style stale data as verified", () => {
    render(<OpportunityCard opportunity={opA} open={false} onToggle={() => {}} verificationStatus="stale" lastVerifiedAt="2026-01-01T00:00:00Z" />);
    expect(screen.getByText(/source needs recheck/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Verified source$/i)).toBeNull();
  });

  it("shows Apply on official site only for a trusted fresh open eligible recommendation", () => {
    render(<OpportunityCard opportunity={opA} open={false} onToggle={() => {}} verificationStatus="verified" applicationStatus="open" statusCheckedAt="2026-08-22T10:00:00Z" applicationUrl="https://alpha.example/apply" primaryApplyEligible eligibilityStatus="eligible" />);
    expect(screen.getByText(/^Open now$/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /apply on official site/i })).toHaveAttribute("href", "https://alpha.example/apply");
  });

  it("never shows the application CTA for closed or unknown status", () => {
    const { rerender } = render(<OpportunityCard opportunity={opA} open={false} onToggle={() => {}} verificationStatus="verified" applicationStatus="closed" applicationUrl="https://alpha.example/apply" primaryApplyEligible={false} eligibilityStatus="eligible" />);
    expect(screen.getByText(/^Closed$/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /apply on official site/i })).toBeNull();
    rerender(<OpportunityCard opportunity={opA} open={false} onToggle={() => {}} verificationStatus="verified" applicationStatus="unknown" applicationUrl="https://alpha.example/apply" primaryApplyEligible={false} eligibilityStatus="eligible" />);
    expect(screen.getByText(/current status unconfirmed/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /apply on official site/i })).toBeNull();
  });

  it("never enables the application CTA when hard eligibility has not passed", () => {
    render(<OpportunityCard opportunity={opA} open={false} onToggle={() => {}} verificationStatus="verified" applicationStatus="open" statusCheckedAt="2026-08-22T10:00:00Z" applicationUrl="https://alpha.example/apply" primaryApplyEligible eligibilityStatus="insufficient_information" />);
    expect(screen.queryByRole("link", { name: /apply on official site/i })).toBeNull();
  });

  it("labels AI-assisted results unknown even if model data tries to claim open", () => {
    const [ai] = parseOpportunities([{ title: "AI Candidate", funder: "Possible Funder", url: "https://possible.example", discovery_source: "ai_assisted", verification_status: "unverified", application_status: "open", application_url: "https://possible.example/apply" }]);
    render(<OpportunityCard opportunity={ai} open={false} onToggle={() => {}} applicationStatus="open" applicationUrl="https://possible.example/apply" primaryApplyEligible eligibilityStatus="eligible" />);
    expect(screen.getByText(/AI discovery · unverified/i)).toBeInTheDocument();
    expect(screen.getByText(/current status unconfirmed/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Open now$/i)).toBeNull();
    expect(screen.queryByRole("link", { name: /apply on official site/i })).toBeNull();
  });

  it("shows a deadline as confirmed only when current-cycle deadline provenance is confirmed", () => {
    const { rerender } = render(<OpportunityCard opportunity={opA} open={false} onToggle={() => {}} deadlineStatus="confirmed" deadlineAt="2026-09-15T23:59:59Z" />);
    expect(screen.getByText(/confirmed deadline/i)).toBeInTheDocument();
    rerender(<OpportunityCard opportunity={opA} open={false} onToggle={() => {}} deadlineStatus="unknown" deadlineAt="2026-09-15T23:59:59Z" />);
    expect(screen.queryByText(/confirmed deadline/i)).toBeNull();
  });
});
