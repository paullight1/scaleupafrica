import { describe, it, expect } from "vitest";
import {
  parseDeadline,
  daysUntilDeadline,
  deadlineLabel,
  isClosingSoon,
  closingSoon,
} from "../deadline";

// Fixed "now" so these never depend on the day they run.
const NOW = new Date("2026-03-01T12:00:00Z").getTime();

describe("parseDeadline", () => {
  it("parses the date formats curators actually type", () => {
    expect(parseDeadline("2026-03-31")).toBeInstanceOf(Date);
    expect(parseDeadline("31 March 2026")).toBeInstanceOf(Date);
    expect(parseDeadline("  2026-03-31  ")).toBeInstanceOf(Date);
  });

  it("refuses non-dates rather than guessing", () => {
    // `deadline` is free TEXT, so these are all legitimate column values. Each
    // must yield null — a wrong "closes in 3 days" would push someone to drop
    // everything for a deadline that does not exist.
    expect(parseDeadline("Rolling")).toBeNull();
    expect(parseDeadline("Ongoing")).toBeNull();
    expect(parseDeadline("Varies by country")).toBeNull();
    expect(parseDeadline("")).toBeNull();
    expect(parseDeadline("   ")).toBeNull();
    expect(parseDeadline(null)).toBeNull();
    expect(parseDeadline(undefined)).toBeNull();
  });

  it("rejects a bare year instead of inventing 1 January", () => {
    // Date.parse("2026") succeeds and returns Jan 1 — which would silently
    // manufacture a deadline nobody entered.
    expect(parseDeadline("2026")).toBeNull();
  });
});

describe("daysUntilDeadline", () => {
  it("counts whole calendar days regardless of time of day", () => {
    expect(daysUntilDeadline("2026-03-01", NOW)).toBe(0);
    expect(daysUntilDeadline("2026-03-02", NOW)).toBe(1);
    expect(daysUntilDeadline("2026-03-08", NOW)).toBe(7);
  });

  it("goes negative once passed, and stays null when unparseable", () => {
    expect(daysUntilDeadline("2026-02-25", NOW)).toBeLessThan(0);
    expect(daysUntilDeadline("Rolling", NOW)).toBeNull();
  });
});

describe("deadlineLabel", () => {
  it("uses human wording at the edges", () => {
    expect(deadlineLabel("2026-03-01", NOW)).toBe("Closes today");
    expect(deadlineLabel("2026-03-02", NOW)).toBe("Closes tomorrow");
    expect(deadlineLabel("2026-03-06", NOW)).toBe("5 days left");
    expect(deadlineLabel("2026-02-01", NOW)).toBe("Closed");
  });

  it("says nothing at all when it cannot be trusted", () => {
    expect(deadlineLabel("Rolling", NOW)).toBeNull();
  });
});

describe("isClosingSoon", () => {
  it("is true only for real, open, near deadlines", () => {
    expect(isClosingSoon("2026-03-10", 30, NOW)).toBe(true);
    expect(isClosingSoon("2026-03-01", 30, NOW)).toBe(true); // today still counts
    expect(isClosingSoon("2026-06-01", 30, NOW)).toBe(false); // too far out
    expect(isClosingSoon("2026-02-01", 30, NOW)).toBe(false); // already closed
    expect(isClosingSoon("Rolling", 30, NOW)).toBe(false); // unparseable
  });
});

describe("closingSoon", () => {
  const items = [
    { id: "far", deadline: "2026-08-01" },
    { id: "soon", deadline: "2026-03-05" },
    { id: "soonest", deadline: "2026-03-02" },
    { id: "past", deadline: "2026-01-01" },
    { id: "rolling", deadline: "Rolling" },
    { id: "none", deadline: null },
  ];

  it("returns only urgent items, soonest first", () => {
    expect(closingSoon(items, 30, NOW).map((i) => i.id)).toEqual(["soonest", "soon"]);
  });

  it("excludes unparseable deadlines rather than sorting them arbitrarily", () => {
    const ids = closingSoon(items, 365, NOW).map((i) => i.id);
    expect(ids).not.toContain("rolling");
    expect(ids).not.toContain("none");
    expect(ids).not.toContain("past");
  });
});
