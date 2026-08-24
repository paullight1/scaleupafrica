import { beforeEach, describe, expect, it } from "vitest";
import { hasAnalyticsConsent, readConsent, writeConsent } from "./consent";

describe("visitor consent", () => {
  beforeEach(() => localStorage.clear());

  it("defaults optional analytics to off until a choice is saved", () => {
    expect(readConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("persists and restores an analytics choice", () => {
    writeConsent({ analytics: true });

    expect(readConsent()).toEqual({ analytics: true });
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it("fails closed when stored consent is malformed", () => {
    localStorage.setItem("cresciva:consent:v1", "not-json");

    expect(readConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });
});
