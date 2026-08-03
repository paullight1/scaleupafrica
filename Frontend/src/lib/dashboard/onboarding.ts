import type { Profile } from "./types";
import { DASHBOARD_PROFILE_EDIT, editProfileHref } from "./routes";

/**
 * Activation checklist.
 *
 * Two deliberate departures from the old `OnboardingChecklist` steps:
 *
 * 1. "Become a member" is NOT a step. A free user can never tick it, so the
 *    card would sit at 6/7 on the dashboard forever, permanently nagging and
 *    permanently blocking Home from graduating to its digest shape. Upgrade is
 *    a decision, not an onboarding chore — it belongs to the funding teaser,
 *    which is the one place it's actually motivated. Every step here is
 *    something the user can finish today, for free, so the card genuinely ends.
 *
 * 2. "Save a funding opportunity" is NOT a step either — a non-member can't
 *    even see an opportunity to save, so it was unachievable for exactly the
 *    users being onboarded. It survives as a next-best-action instead.
 *
 * Every step derives from server data; nothing is remembered in localStorage,
 * so the checklist is correct on a new device.
 */

export interface OnboardingStep {
  key: string;
  label: string;
  /** Why it matters — shown only on the one expanded step. */
  why: string;
  done: boolean;
  href?: string;
  /** Label for the step's action button. */
  cta?: string;
}

export interface OnboardingState {
  steps: OnboardingStep[];
  doneCount: number;
  total: number;
  /** All steps ticked — the card should disappear entirely, not congratulate. */
  complete: boolean;
  /** The single step to expand. Null once complete. */
  next: OnboardingStep | null;
}

function hasKeywords(p: Profile | null | undefined): boolean {
  return Array.isArray(p?.keywords) && p!.keywords!.filter((k) => k?.trim()).length >= 3;
}

export function onboardingState(profile: Profile | null | undefined): OnboardingState {
  const steps: OnboardingStep[] = [
    {
      key: "account",
      label: "Create your account",
      why: "Done — you're signed in.",
      done: true,
    },
    {
      key: "publish",
      label: "Publish your business profile",
      why: "It's how partners, customers and funders find you.",
      done: !!profile,
      href: DASHBOARD_PROFILE_EDIT,
      cta: "Start",
    },
    {
      key: "logo",
      label: "Add your logo",
      why: "Profiles with a logo get noticeably more clicks in the directory.",
      done: !!profile?.logo_url,
      href: editProfileHref("identity"),
      cta: "Add logo",
    },
    {
      key: "story",
      label: "Tell your story",
      why: "A real description is what turns a listing into a conversation.",
      done: !!profile?.long_description?.trim(),
      href: editProfileHref("story"),
      cta: "Write it",
    },
    {
      key: "keywords",
      label: "Add keywords for matching",
      why: "Keywords are what we match funding opportunities against.",
      done: hasKeywords(profile),
      href: editProfileHref("matching"),
      cta: "Add keywords",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const complete = doneCount === steps.length;

  return {
    steps,
    doneCount,
    total: steps.length,
    complete,
    next: complete ? null : (steps.find((s) => !s.done) ?? null),
  };
}
