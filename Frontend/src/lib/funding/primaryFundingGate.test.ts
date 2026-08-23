import { describe, expect, it } from "vitest";
import { classifyFundingSurface, type PrimaryFundingGateInput } from "./primaryFundingGate";

function input(overrides: Partial<PrimaryFundingGateInput> = {}): PrimaryFundingGateInput {
  return {
    verificationStatus: "verified",
    applicationStatus: "open",
    eligibilityStatus: "eligible",
    statusFresh: true,
    discoverySource: "verified_feed",
    ...overrides,
  };
}

describe("classifyFundingSurface", () => {
  it("puts verified fresh open eligible into Open for you", () => {
    expect(classifyFundingSurface(input())).toEqual(["open_for_you"]);
  });

  it("puts verified fresh closing-soon eligible into both primary and urgency views", () => {
    expect(classifyFundingSurface(input({ applicationStatus: "closing_soon" }))).toEqual([
      "open_for_you",
      "closing_soon",
    ]);
  });

  it("puts verified fresh rolling eligible into Open for you", () => {
    expect(classifyFundingSurface(input({ applicationStatus: "rolling" }))).toEqual(["open_for_you"]);
  });

  it("puts upcoming verified eligible into Watchlist", () => {
    expect(classifyFundingSurface(input({ applicationStatus: "upcoming" }))).toEqual(["watchlist"]);
  });

  it("puts open but incomplete eligibility into Watchlist", () => {
    expect(classifyFundingSurface(input({ eligibilityStatus: "insufficient_information" }))).toEqual(["watchlist"]);
  });

  it("puts unknown current status into Watchlist", () => {
    expect(classifyFundingSurface(input({ applicationStatus: "unknown" }))).toEqual(["watchlist"]);
  });

  it("puts stale stored open into Watchlist", () => {
    expect(classifyFundingSurface(input({ statusFresh: false }))).toEqual(["watchlist"]);
  });

  it("puts verified closed into Explore", () => {
    expect(classifyFundingSurface(input({ applicationStatus: "closed" }))).toEqual(["explore"]);
  });

  it("puts verified paused into Watchlist instead of the primary action list", () => {
    expect(classifyFundingSurface(input({ applicationStatus: "paused" }))).toEqual(["watchlist"]);
  });

  it("keeps unverified AI discovery Explore-only even if model data claims open", () => {
    expect(classifyFundingSurface(input({
      verificationStatus: "unverified",
      discoverySource: "ai_assisted",
      applicationStatus: "open",
    }))).toEqual(["explore"]);
  });

  it("keeps stale verification Explore-only", () => {
    expect(classifyFundingSurface(input({ verificationStatus: "stale" }))).toEqual(["explore"]);
  });

  it("puts hard ineligible records into Explore", () => {
    expect(classifyFundingSurface(input({ eligibilityStatus: "ineligible" }))).toEqual(["explore"]);
  });

  it("keeps possibly eligible open records on Watchlist for member clarification", () => {
    expect(classifyFundingSurface(input({ eligibilityStatus: "possibly_eligible" }))).toEqual(["watchlist"]);
  });
});