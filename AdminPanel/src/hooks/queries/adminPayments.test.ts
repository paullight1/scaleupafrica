import { describe, expect, it } from "vitest";
import { resolvePaymentPeriod } from "./adminPayments";

describe("resolvePaymentPeriod", () => {
  it("returns the complete selected calendar month", () => {
    expect(resolvePaymentPeriod({
      mode: "monthly",
      month: "2024-02",
      year: "2024",
      customFrom: "",
      customTo: "",
    })).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
      label: "February 2024",
      valid: true,
    });
  });

  it("returns the complete selected calendar year", () => {
    expect(resolvePaymentPeriod({
      mode: "yearly",
      month: "2026-08",
      year: "2025",
      customFrom: "",
      customTo: "",
    })).toEqual({
      from: "2025-01-01",
      to: "2025-12-31",
      label: "2025",
      valid: true,
    });
  });

  it("rejects years that cannot be represented by the reporting date input", () => {
    expect(resolvePaymentPeriod({
      mode: "yearly",
      month: "2026-08",
      year: "0000",
      customFrom: "",
      customTo: "",
    }).valid).toBe(false);
  });

  it("leaves lifetime unbounded", () => {
    expect(resolvePaymentPeriod({
      mode: "lifetime",
      month: "2026-08",
      year: "2026",
      customFrom: "",
      customTo: "",
    })).toEqual({ from: null, to: null, label: "Lifetime", valid: true });
  });

  it("rejects a custom range whose end precedes its start", () => {
    expect(resolvePaymentPeriod({
      mode: "custom",
      month: "2026-08",
      year: "2026",
      customFrom: "2026-08-20",
      customTo: "2026-08-01",
    })).toEqual({
      from: "2026-08-20",
      to: "2026-08-01",
      label: "Custom range",
      valid: false,
    });
  });
});
