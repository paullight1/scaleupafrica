import { describe, expect, it } from "vitest";
import {
  classifyFundingStatus,
  effectiveFundingStatus,
  freshnessWindowMs,
  hasFundingStatusConflict,
  isStatusFresh,
  type FundingStatusSignals,
} from "./fundingStatus";
import type { ApplicationStatus } from "../../contracts/funding";

const NOW = new Date("2026-08-22T12:00:00Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function signals(over: Partial<FundingStatusSignals> = {}): FundingStatusSignals {
  return {
    sourceVerified: true,
    checkedAt: NOW,
    cycleLabel: "2026 cycle",
    explicitOpen: false,
    explicitClosed: false,
    explicitPaused: false,
    explicitRolling: false,
    applicationCtaActive: false,
    opensAt: null,
    deadlineAt: null,
    hasCurrentCycleEvidence: true,
    conflict: false,
    ...over,
  };
}

type ClassificationCase = [name: string, input: Partial<FundingStatusSignals>, expected: ApplicationStatus];
const classificationCases: ClassificationCase[] = [
  ["explicit open + CTA + far deadline", { explicitOpen:true,applicationCtaActive:true,deadlineAt:new Date(NOW.getTime()+30*DAY) }, "open"],
  ["explicit open + CTA + no deadline", { explicitOpen:true,applicationCtaActive:true,deadlineAt:null }, "open"],
  ["explicit open + CTA + invalid deadline is unsupported", { explicitOpen:true,applicationCtaActive:true,deadlineAt:new Date("invalid") }, "open"],
  ["open exactly 14 days before deadline", { explicitOpen:true,applicationCtaActive:true,deadlineAt:new Date(NOW.getTime()+14*DAY) }, "closing_soon"],
  ["open 14 days minus one millisecond", { explicitOpen:true,applicationCtaActive:true,deadlineAt:new Date(NOW.getTime()+14*DAY-1) }, "closing_soon"],
  ["open 14 days plus one millisecond", { explicitOpen:true,applicationCtaActive:true,deadlineAt:new Date(NOW.getTime()+14*DAY+1) }, "open"],
  ["deadline exactly now", { explicitOpen:true,applicationCtaActive:true,deadlineAt:NOW }, "closing_soon"],
  ["expired deadline cannot remain open", { explicitOpen:true,applicationCtaActive:true,deadlineAt:new Date(NOW.getTime()-1) }, "unknown"],
  ["future deadline alone", { deadlineAt:new Date(NOW.getTime()+30*DAY) }, "unknown"],
  ["explicit open without active CTA", { explicitOpen:true,applicationCtaActive:false }, "unknown"],
  ["active CTA without explicit open", { applicationCtaActive:true }, "unknown"],
  ["rolling + active intake", { explicitRolling:true,applicationCtaActive:true }, "rolling"],
  ["rolling without active intake", { explicitRolling:true,applicationCtaActive:false }, "unknown"],
  ["missing deadline is not rolling", {}, "unknown"],
  ["future opening date", { opensAt:new Date(NOW.getTime()+10*DAY) }, "upcoming"],
  ["opening date equal to now is not upcoming", { opensAt:NOW }, "unknown"],
  ["past opening date alone is insufficient", { opensAt:new Date(NOW.getTime()-DAY) }, "unknown"],
  ["future opening plus explicit open + CTA uses live open signal", { opensAt:new Date(NOW.getTime()+10*DAY),explicitOpen:true,applicationCtaActive:true }, "open"],
  ["explicit closed", { explicitClosed:true }, "closed"],
  ["explicit paused", { explicitPaused:true }, "paused"],
  ["paused takes deterministic precedence after conflict has been ruled out", { explicitPaused:true,explicitClosed:true,conflict:false }, "paused"],
  ["conflict always fails closed", { conflict:true,explicitOpen:true,applicationCtaActive:true }, "unknown"],
  ["open/closed conflict flag fails closed", { conflict:true,explicitOpen:true,explicitClosed:true,applicationCtaActive:true }, "unknown"],
  ["rolling/closed conflict flag fails closed", { conflict:true,explicitRolling:true,explicitClosed:true,applicationCtaActive:true }, "unknown"],
  ["unverified source cannot create open", { sourceVerified:false,explicitOpen:true,applicationCtaActive:true }, "unknown"],
  ["unverified source cannot create upcoming", { sourceVerified:false,opensAt:new Date(NOW.getTime()+DAY) }, "unknown"],
  ["missing current-cycle evidence cannot create open", { hasCurrentCycleEvidence:false,explicitOpen:true,applicationCtaActive:true }, "unknown"],
  ["missing current-cycle evidence cannot create closed", { hasCurrentCycleEvidence:false,explicitClosed:true }, "unknown"],
  ["invalid check timestamp fails closed", { checkedAt:new Date("invalid"),explicitOpen:true,applicationCtaActive:true }, "unknown"],
  ["empty evidence with verified source stays unknown", { cycleLabel:null }, "unknown"],
];

describe("funding status conflict detection", () => {
  it.each([
    [{ explicitOpen: true, explicitClosed: true }, true],
    [{ explicitOpen: true, explicitPaused: true }, true],
    [{ explicitRolling: true, explicitClosed: true }, true],
    [{ explicitRolling: true, explicitPaused: true }, true],
    [{ explicitClosed: true, explicitPaused: true }, true],
    [{ explicitOpen: true }, false],
    [{ explicitClosed: true }, false],
    [{ explicitPaused: true }, false],
    [{ explicitRolling: true }, false],
  ] as const)("returns %s for %j", (input, expected) => {
    expect(hasFundingStatusConflict(input)).toBe(expected);
  });
});

describe("classifyFundingStatus — certification truth table", () => {
  it.each(classificationCases)("%s", (_name, input, expected) => {
    expect(classifyFundingStatus(signals(input), NOW)).toBe(expected);
  });
});

const windows: Array<[ApplicationStatus, number]> = [
  ["closing_soon", 6*HOUR],
  ["open", 24*HOUR],
  ["rolling", 48*HOUR],
  ["upcoming", 24*HOUR],
  ["closed", 7*DAY],
  ["paused", 24*HOUR],
  ["unknown", 12*HOUR],
];

describe("funding status freshness — certification boundaries", () => {
  it.each(windows)("%s uses the exact configured freshness window", (status, window) => {
    expect(freshnessWindowMs(status)).toBe(window);
  });

  it.each(windows)("%s is fresh at the exact boundary", (status, window) => {
    const checked = new Date(NOW.getTime()-window);
    expect(isStatusFresh(status, checked, NOW)).toBe(true);
    expect(effectiveFundingStatus(status, checked, NOW)).toBe(status);
  });

  it.each(windows)("%s becomes unknown one millisecond past its boundary", (status, window) => {
    const checked = new Date(NOW.getTime()-window-1);
    expect(isStatusFresh(status, checked, NOW)).toBe(false);
    expect(effectiveFundingStatus(status, checked, NOW)).toBe("unknown");
  });

  it("future check timestamps are never fresh", () => {
    expect(isStatusFresh("open",new Date(NOW.getTime()+1),NOW)).toBe(false);
  });

  it("invalid and missing check timestamps are never fresh", () => {
    expect(isStatusFresh("open","not-a-date",NOW)).toBe(false);
    expect(isStatusFresh("open",null,NOW)).toBe(false);
    expect(isStatusFresh("open",undefined,NOW)).toBe(false);
  });
});
