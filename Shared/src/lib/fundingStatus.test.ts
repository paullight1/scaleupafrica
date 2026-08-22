import { describe, expect, it } from "vitest";
import {
  classifyFundingStatus,
  effectiveFundingStatus,
  freshnessWindowMs,
  isStatusFresh,
  type FundingStatusSignals,
} from "./fundingStatus";

const NOW = new Date("2026-08-22T12:00:00Z");

function signals(over: Partial<FundingStatusSignals> = {}): FundingStatusSignals {
  return {
    sourceVerified: true,
    checkedAt: NOW,
    cycleLabel: "2026",
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

describe("classifyFundingStatus", () => {
  it("classifies explicit current-cycle open intake", () => {
    expect(classifyFundingStatus(signals({
      explicitOpen: true,
      applicationCtaActive: true,
      deadlineAt: new Date("2026-09-30T23:59:00Z"),
    }), NOW)).toBe("open");
  });

  it("classifies current open intake closing within fourteen days", () => {
    expect(classifyFundingStatus(signals({
      explicitOpen: true,
      applicationCtaActive: true,
      deadlineAt: new Date("2026-08-30T23:59:00Z"),
    }), NOW)).toBe("closing_soon");
  });

  it("classifies explicitly rolling active intake", () => {
    expect(classifyFundingStatus(signals({ explicitRolling: true, applicationCtaActive: true }), NOW)).toBe("rolling");
  });

  it("classifies a future current-cycle opening date as upcoming", () => {
    expect(classifyFundingStatus(signals({ opensAt: new Date("2026-09-10T00:00:00Z") }), NOW)).toBe("upcoming");
  });

  it("honors explicit closed and paused evidence", () => {
    expect(classifyFundingStatus(signals({ explicitClosed: true }), NOW)).toBe("closed");
    expect(classifyFundingStatus(signals({ explicitPaused: true }), NOW)).toBe("paused");
  });

  it("does not infer open from a future deadline alone", () => {
    expect(classifyFundingStatus(signals({ deadlineAt: new Date("2026-09-30T23:59:00Z") }), NOW)).toBe("unknown");
  });

  it("does not infer rolling from a missing deadline", () => {
    expect(classifyFundingStatus(signals(), NOW)).toBe("unknown");
  });

  it("fails closed on conflict or missing source/current-cycle evidence", () => {
    expect(classifyFundingStatus(signals({ conflict: true, explicitOpen: true, applicationCtaActive: true }), NOW)).toBe("unknown");
    expect(classifyFundingStatus(signals({ sourceVerified: false, explicitOpen: true, applicationCtaActive: true }), NOW)).toBe("unknown");
    expect(classifyFundingStatus(signals({ hasCurrentCycleEvidence: false, explicitOpen: true, applicationCtaActive: true }), NOW)).toBe("unknown");
  });
});

describe("funding status freshness", () => {
  it("uses exact per-status freshness windows", () => {
    expect(freshnessWindowMs("closing_soon")).toBe(6 * 60 * 60 * 1000);
    expect(freshnessWindowMs("open")).toBe(24 * 60 * 60 * 1000);
    expect(freshnessWindowMs("rolling")).toBe(48 * 60 * 60 * 1000);
    expect(freshnessWindowMs("upcoming")).toBe(24 * 60 * 60 * 1000);
    expect(freshnessWindowMs("closed")).toBe(7 * 24 * 60 * 60 * 1000);
    expect(freshnessWindowMs("paused")).toBe(24 * 60 * 60 * 1000);
    expect(freshnessWindowMs("unknown")).toBe(12 * 60 * 60 * 1000);
  });

  it("demotes stale open and closing-soon status to effective unknown", () => {
    const oldOpen = new Date(NOW.getTime() - 25 * 60 * 60 * 1000);
    const oldClosing = new Date(NOW.getTime() - 7 * 60 * 60 * 1000);
    expect(isStatusFresh("open", oldOpen, NOW)).toBe(false);
    expect(effectiveFundingStatus("open", oldOpen, NOW)).toBe("unknown");
    expect(effectiveFundingStatus("closing_soon", oldClosing, NOW)).toBe("unknown");
  });
});
