import type { Action, Profile } from "./types";
import type { CompletenessResult } from "./profileCompleteness";

/**
 * Ordered next-best-actions (plan 03 §2.4). First match is the hero slot; up to
 * 3 are rendered on the guidance pane. Pure — depends only on already-fetched
 * data passed in. `subscriptionActive` is computed by the caller with the
 * centralized rule (`isSubscriptionActive` from `@/lib/subscription`, plan 05)
 * so this module stays dependency-free and unit-testable.
 */

export interface NextBestActionInput {
  profile: Profile | null | undefined;
  /**
   * Tri-state so "couldn't confirm" ≠ "inactive" (TRUST-1). `true`/`false` are a
   * confirmed read; `"unknown"` means the subscription query errored — never
   * surface the paywall/upgrade action to a possibly-paying member on a flaky
   * connection (mirrors the `!subQ.isError` guard for UpgradeBanner).
   */
  subscriptionActive: boolean | "unknown";
  completeness: CompletenessResult;
  savedCount: number;
  feedNewCount: number;
}

export function nextBestActions(input: NextBestActionInput): Action[] {
  const { profile, completeness, subscriptionActive, savedCount, feedNewCount } = input;
  const actions: Action[] = [];

  // 1. No profile
  if (!profile) {
    actions.push({
      key: "create-profile",
      title: "Create your business profile",
      why: "It's how partners, customers and funders find you.",
      href: "/directory/create",
    });
  } else {
    // 2. Low completeness → the top-weighted missing item
    if (completeness.percent < 70 && completeness.missing.length > 0) {
      const top = completeness.missing[0];
      actions.push({
        key: `complete-${top.key}`,
        title: top.label,
        why: "A complete profile gets matched to more opportunities.",
        href: top.href,
      });
    }

    // 3. Hidden profile
    if (profile.status === "hidden") {
      actions.push({
        key: "unhide-profile",
        title: "Your profile is hidden from the directory — make it visible",
        why: "Hidden profiles don't appear to funders or partners.",
        href: "/dashboard/profile",
      });
    }
  }

  // 4. No active membership — only when the read is *confirmed* inactive.
  // When "unknown" (query errored) we suppress this rather than risk paywalling a paying member.
  if (subscriptionActive === false) {
    actions.push({
      key: "unlock-radar",
      title: "Unlock the full funding radar",
      why: "Members get the full AI-curated list, not just the free feed.",
      href: "/dashboard/billing#billing",
    });
  }

  // 5. New opportunities this week
  if (feedNewCount > 0) {
    actions.push({
      key: "review-new",
      title: `${feedNewCount} new ${feedNewCount === 1 ? "opportunity" : "opportunities"} this week — review and save the ones that fit`,
      why: "Fresh opportunities are added to the curated feed regularly.",
      href: "/dashboard",
    });
  }

  // 6. Nothing saved
  if (savedCount === 0) {
    actions.push({
      key: "save-first",
      title: "Save your first opportunity so you never lose the link",
      why: "Bookmark any opportunity to keep it one tap away.",
      href: "/dashboard",
    });
  }

  // 7. Fallback — share loop
  actions.push({
    key: "share-profile",
    title: "Share your profile link on WhatsApp",
    why: "The fastest way to get seen is to send your link to your network.",
    href: "/dashboard/profile",
  });

  return actions;
}
