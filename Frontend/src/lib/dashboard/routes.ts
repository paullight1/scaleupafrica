/**
 * Dashboard route + profile-section contract (single source of truth).
 *
 * Every deep link into the profile editor is built with `editProfileHref` rather
 * than string-concatenated at the call site — the old code scattered
 * "/directory/create#logo" across four modules, so the editor's move could not
 * be made without hunting them down. Old paths still redirect (App.tsx), but
 * nothing in the app should emit them.
 */

export const DASHBOARD_HOME = "/dashboard";
export const DASHBOARD_FUNDING = "/dashboard/funding";
export const DASHBOARD_PROFILE = "/dashboard/profile";
export const DASHBOARD_PROFILE_EDIT = "/dashboard/profile/edit";
export const DASHBOARD_ACCOUNT = "/dashboard/account";
export const DASHBOARD_ACCOUNT_BILLING = "/dashboard/account#billing";

/** The editable groups of the profile form. Order is the wizard order. */
export const PROFILE_SECTIONS = ["identity", "story", "matching", "contact"] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

/** The three steps a first-time user is walked through. Contact comes later. */
export const WIZARD_STEPS: ProfileSection[] = ["identity", "story", "matching"];

export const SECTION_META: Record<
  ProfileSection,
  { title: string; blurb: string }
> = {
  identity: {
    title: "Identity",
    blurb: "Who you are and what you look like.",
  },
  story: {
    title: "Your story",
    blurb: "What you do, in your own words.",
  },
  matching: {
    title: "Matching",
    blurb: "Keywords we use to match funding to you.",
  },
  contact: {
    title: "Contact & links",
    blurb: "How people reach you once they've found you.",
  },
};

/** Narrow an untrusted `?section=` param to a real section. */
export function asProfileSection(raw: string | null | undefined): ProfileSection | null {
  return PROFILE_SECTIONS.includes(raw as ProfileSection) ? (raw as ProfileSection) : null;
}

/** Deep link into one section of the profile editor. */
export function editProfileHref(section?: ProfileSection): string {
  return section ? `${DASHBOARD_PROFILE_EDIT}?section=${section}` : DASHBOARD_PROFILE_EDIT;
}
