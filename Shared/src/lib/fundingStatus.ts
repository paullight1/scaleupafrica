import type { ApplicationStatus } from "../../contracts/funding";

export interface FundingStatusSignals {
  sourceVerified: boolean;
  checkedAt: Date;
  cycleLabel?: string | null;
  explicitOpen: boolean;
  explicitClosed: boolean;
  explicitPaused: boolean;
  explicitRolling: boolean;
  applicationCtaActive: boolean;
  opensAt?: Date | null;
  deadlineAt?: Date | null;
  hasCurrentCycleEvidence: boolean;
  conflict: boolean;
}

export interface FundingStatusConflictSignals {
  explicitOpen?: boolean;
  explicitClosed?: boolean;
  explicitPaused?: boolean;
  explicitRolling?: boolean;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const CLOSING_SOON_DAYS = 14;

/**
 * Any pair of mutually incompatible current-cycle states is a conflict.
 * This helper is shared by source refresh and admin health views so staff see
 * the same fail-closed decision that the classifier used.
 */
export function hasFundingStatusConflict(signals: FundingStatusConflictSignals): boolean {
  const open = Boolean(signals.explicitOpen);
  const closed = Boolean(signals.explicitClosed);
  const paused = Boolean(signals.explicitPaused);
  const rolling = Boolean(signals.explicitRolling);
  return (
    (open && closed) ||
    (open && paused) ||
    (rolling && closed) ||
    (rolling && paused) ||
    (closed && paused)
  );
}

export function classifyFundingStatus(
  signals: FundingStatusSignals,
  now = new Date(),
): ApplicationStatus {
  if (signals.conflict) return "unknown";
  if (!signals.sourceVerified || !signals.hasCurrentCycleEvidence) return "unknown";
  if (!validDate(signals.checkedAt)) return "unknown";

  if (signals.explicitPaused) return "paused";
  if (signals.explicitClosed) return "closed";

  if (signals.explicitRolling && signals.applicationCtaActive) return "rolling";

  const opensAt = dateOrNull(signals.opensAt);
  if (opensAt && opensAt.getTime() > now.getTime() && !signals.explicitOpen) {
    return "upcoming";
  }

  if (signals.explicitOpen && signals.applicationCtaActive) {
    const deadline = dateOrNull(signals.deadlineAt);
    if (deadline) {
      if (deadline.getTime() < now.getTime()) return "unknown";
      const remaining = deadline.getTime() - now.getTime();
      if (remaining <= CLOSING_SOON_DAYS * DAY) return "closing_soon";
    }
    return "open";
  }

  return "unknown";
}

export function freshnessWindowMs(status: ApplicationStatus): number {
  switch (status) {
    case "closing_soon":
      return 6 * HOUR;
    case "open":
      return 24 * HOUR;
    case "rolling":
      return 48 * HOUR;
    case "upcoming":
      return 24 * HOUR;
    case "closed":
      return 7 * DAY;
    case "paused":
      return 24 * HOUR;
    case "unknown":
      return 12 * HOUR;
  }
}

export function isStatusFresh(
  status: ApplicationStatus,
  checkedAt: Date | string | null | undefined,
  now = new Date(),
): boolean {
  const checked = dateOrNull(checkedAt);
  if (!checked) return false;
  const age = now.getTime() - checked.getTime();
  return age >= 0 && age <= freshnessWindowMs(status);
}

export function effectiveFundingStatus(
  storedStatus: ApplicationStatus,
  checkedAt: Date | string | null | undefined,
  now = new Date(),
): ApplicationStatus {
  return isStatusFresh(storedStatus, checkedAt, now) ? storedStatus : "unknown";
}

function dateOrNull(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return validDate(date) ? date : null;
}

function validDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}
