import type { ApplicationStatus } from "../../contracts/funding";

export type NotificationMemberState = "saved" | "preparing" | "applied" | "won" | "rejected" | "dismissed" | null;
export type FundingNotificationEvent = "watchlist_opened" | "closing_soon" | "deadline_changed";

export interface FundingNotificationContext {
  memberState: NotificationMemberState;
  emailNewMatches: boolean;
  emailDeadlineAlerts: boolean;
  previousStatus: ApplicationStatus;
  nextStatus: ApplicationStatus;
  previousDeadlineAt: string | null;
  nextDeadlineAt: string | null;
}

function isWatching(state: NotificationMemberState): boolean {
  return state === "saved" || state === "preparing";
}

function deadlineChanged(input: FundingNotificationContext): boolean {
  return Boolean(
    input.previousDeadlineAt &&
    input.nextDeadlineAt &&
    input.previousDeadlineAt !== input.nextDeadlineAt,
  );
}

export function notificationEventType(input: FundingNotificationContext): FundingNotificationEvent | null {
  if (!isWatching(input.memberState)) return null;

  if (
    input.nextStatus === "open" &&
    input.previousStatus !== "open" &&
    input.previousStatus !== "closing_soon" &&
    input.previousStatus !== "rolling"
  ) {
    return "watchlist_opened";
  }

  if (input.nextStatus === "closing_soon" && input.previousStatus !== "closing_soon") {
    return "closing_soon";
  }

  if (deadlineChanged(input)) return "deadline_changed";
  return null;
}

export function shouldNotifyTransition(input: FundingNotificationContext): boolean {
  const event = notificationEventType(input);
  if (!event) return false;
  if (event === "watchlist_opened") return input.emailNewMatches;
  return input.emailDeadlineAlerts;
}