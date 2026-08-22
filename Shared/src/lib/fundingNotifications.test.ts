import { describe, expect, it } from "vitest";
import { shouldNotifyTransition, notificationEventType, type FundingNotificationContext } from "./fundingNotifications";

function context(overrides: Partial<FundingNotificationContext> = {}): FundingNotificationContext {
  return {
    memberState: "saved",
    emailNewMatches: true,
    emailDeadlineAlerts: true,
    previousStatus: "upcoming",
    nextStatus: "open",
    previousDeadlineAt: null,
    nextDeadlineAt: null,
    ...overrides,
  };
}

describe("shouldNotifyTransition", () => {
  it("notifies when a saved upcoming opportunity becomes open", () => {
    expect(shouldNotifyTransition(context())).toBe(true);
    expect(notificationEventType(context())).toBe("watchlist_opened");
  });

  it("notifies when a saved open opportunity becomes closing soon", () => {
    const input = context({ previousStatus: "open", nextStatus: "closing_soon" });
    expect(shouldNotifyTransition(input)).toBe(true);
    expect(notificationEventType(input)).toBe("closing_soon");
  });

  it("notifies on a confirmed deadline change when deadline alerts are enabled", () => {
    const input = context({ previousStatus: "open", nextStatus: "open", previousDeadlineAt: "2026-09-01T00:00:00Z", nextDeadlineAt: "2026-09-10T00:00:00Z" });
    expect(shouldNotifyTransition(input)).toBe(true);
    expect(notificationEventType(input)).toBe("deadline_changed");
  });

  it("does not notify dismissed or rejected member workflow rows", () => {
    expect(shouldNotifyTransition(context({ memberState: "dismissed" }))).toBe(false);
    expect(shouldNotifyTransition(context({ memberState: "rejected" }))).toBe(false);
  });

  it("does not notify unsaved unrelated opportunities", () => {
    expect(shouldNotifyTransition(context({ memberState: null }))).toBe(false);
  });

  it("respects email_new_matches for opened watchlist opportunities", () => {
    expect(shouldNotifyTransition(context({ emailNewMatches: false }))).toBe(false);
  });

  it("respects email_deadline_alerts for closing/deadline transitions", () => {
    expect(shouldNotifyTransition(context({ previousStatus: "open", nextStatus: "closing_soon", emailDeadlineAlerts: false }))).toBe(false);
    expect(shouldNotifyTransition(context({ previousStatus: "open", nextStatus: "open", previousDeadlineAt: "2026-09-01T00:00:00Z", nextDeadlineAt: "2026-09-10T00:00:00Z", emailDeadlineAlerts: false }))).toBe(false);
  });

  it("does not notify when nothing materially changed", () => {
    expect(shouldNotifyTransition(context({ previousStatus: "open", nextStatus: "open" }))).toBe(false);
  });
});