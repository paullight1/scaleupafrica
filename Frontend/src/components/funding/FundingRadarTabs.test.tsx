// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FundingRadarTabs } from "./FundingRadarTabs";
import type { FundingRadarTabItem } from "./fundingRadarTabs.utils";

const items: FundingRadarTabItem[] = [
  { id: "open", gate: { verificationStatus:"verified",applicationStatus:"open",eligibilityStatus:"eligible",statusFresh:true,discoverySource:"verified_feed" } },
  { id: "soon", gate: { verificationStatus:"verified",applicationStatus:"closing_soon",eligibilityStatus:"eligible",statusFresh:true,discoverySource:"verified_feed" } },
  { id: "upcoming", gate: { verificationStatus:"verified",applicationStatus:"upcoming",eligibilityStatus:"eligible",statusFresh:true,discoverySource:"verified_feed" } },
  { id: "closed", gate: { verificationStatus:"verified",applicationStatus:"closed",eligibilityStatus:"eligible",statusFresh:true,discoverySource:"verified_feed" } },
  { id: "ai", gate: { verificationStatus:"unverified",applicationStatus:"open",eligibilityStatus:"eligible",statusFresh:true,discoverySource:"ai_assisted" } },
];

describe("FundingRadarTabs", () => {
  it("derives counts from the single surface classifier", () => {
    render(<FundingRadarTabs items={items} active="open_for_you" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /Open for you 2/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Closing soon 1/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Watchlist 1/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Explore 2/i })).toBeInTheDocument();
  });

  it("never counts AI discovery in the first three tabs", () => {
    render(<FundingRadarTabs items={[items[4]]} active="open_for_you" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /Open for you 0/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Closing soon 0/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Watchlist 0/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Explore 1/i })).toBeInTheDocument();
  });

  it("keeps closed records out of Open and Closing", () => {
    render(<FundingRadarTabs items={[items[3]]} active="open_for_you" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /Open for you 0/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Closing soon 0/i })).toBeInTheDocument();
  });

  it("uses accessible tabs and emits the selected surface", () => {
    const onChange = vi.fn();
    render(<FundingRadarTabs items={items} active="open_for_you" onChange={onChange} />);
    const tablist = screen.getByRole("tablist", { name: /funding radar views/i });
    expect(tablist).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Open for you/i })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: /Watchlist/i }));
    expect(onChange).toHaveBeenCalledWith("watchlist");
  });

  it("renders an honest zero count instead of padding Open with Explore", () => {
    render(<FundingRadarTabs items={[items[3], items[4]]} active="open_for_you" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /Open for you 0/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Explore 2/i })).toBeInTheDocument();
  });
});
