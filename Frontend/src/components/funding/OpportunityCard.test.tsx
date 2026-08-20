import { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { OpportunityCard } from "@/components/funding/OpportunityCard";
import { parseOpportunities, type Opportunity } from "@/lib/fundingSchema";

const [opA] = parseOpportunities([
  { title: "Alpha Grant", funder: "Alpha Org", url: "https://alpha.example", funder_about: "About Alpha org." },
]);
const [opB] = parseOpportunities([
  { title: "Beta Grant", funder: "Beta Org", url: "https://beta.example", funder_about: "About Beta org." },
]);
const [opNoUrl] = parseOpportunities([
  { title: "Gamma Grant", funder: "Gamma Org", url: "javascript:alert(1)", funder_about: "About Gamma org." },
]);

function MultiHarness({ opps }: { opps: Opportunity[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  return (
    <>
      {opps.map((o) => (
        <OpportunityCard key={o.title} opportunity={o} open={open.has(o.title)} onToggle={() => toggle(o.title)} />
      ))}
    </>
  );
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

  it("renders no 'Visit funder site' link when the url is null", () => {
    render(<OpportunityCard opportunity={opNoUrl} open onToggle={() => {}} />);
    expect(opNoUrl.url).toBeNull();
    expect(screen.queryByRole("link", { name: /visit funder site/i })).toBeNull();
  });

  it("toggles aria-expanded", () => {
    render(<MultiHarness opps={[opA]} />);
    const btn = screen.getByRole("button", { name: /learn more/i });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    const collapse = screen.getByRole("button", { name: /show less/i });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
  });

  it("renders a valid funder link", () => {
    render(<OpportunityCard opportunity={opA} open onToggle={() => {}} />);
    const link = screen.getByRole("link", { name: /visit funder site/i });
    expect(within(link).queryByText).toBeDefined();
    expect(link).toHaveAttribute("href", "https://alpha.example/");
  });
});
