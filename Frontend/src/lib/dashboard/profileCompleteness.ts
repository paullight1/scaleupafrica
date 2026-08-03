import type { MissingItem, Profile } from "./types";
import { editProfileHref, type ProfileSection } from "./routes";

/**
 * Deterministic profile-completeness score. Weights sum to 100 (see plan 03 §2.4).
 * A field counts when non-empty (trimmed). A null profile scores 0 with every
 * item missing.
 *
 * Each MissingItem carries the editor `section` that fixes it, so the UI can
 * both group gaps under the right row and deep-link straight into that
 * section's form — the gap and the fix are the same object.
 */

type Weight = {
  key: string;
  label: string;
  weight: number;
  section: ProfileSection;
  present: (p: Profile) => boolean;
};

function nonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

const WEIGHTS: Weight[] = [
  {
    key: "basics",
    label: "Business name, country & sector",
    weight: 15,
    section: "identity",
    present: (p) => nonEmpty(p.business_name) && nonEmpty(p.country) && nonEmpty(p.sector),
  },
  {
    key: "short_description",
    label: "Add a short tagline",
    weight: 10,
    section: "story",
    present: (p) => nonEmpty(p.short_description),
  },
  {
    key: "long_description",
    label: "Tell your story",
    weight: 15,
    section: "story",
    present: (p) => nonEmpty(p.long_description),
  },
  {
    key: "logo_url",
    label: "Add a logo — profiles with logos get noticed",
    weight: 15,
    section: "identity",
    present: (p) => nonEmpty(p.logo_url),
  },
  {
    key: "founder_name",
    label: "Add the founder's name",
    weight: 5,
    section: "identity",
    present: (p) => nonEmpty(p.founder_name),
  },
  {
    key: "founder_photo_url",
    label: "Add a founder photo",
    weight: 10,
    section: "identity",
    present: (p) => nonEmpty(p.founder_photo_url),
  },
  {
    key: "website",
    label: "Add your website",
    weight: 10,
    section: "contact",
    present: (p) => nonEmpty(p.website),
  },
  {
    key: "contact",
    label: "Add a contact method (email, phone or WhatsApp)",
    weight: 10,
    section: "contact",
    present: (p) => nonEmpty(p.email) || nonEmpty(p.phone) || nonEmpty(p.whatsapp),
  },
  {
    key: "social",
    label: "Link a social profile",
    weight: 5,
    section: "contact",
    present: (p) => nonEmpty(p.instagram) || nonEmpty(p.linkedin) || nonEmpty(p.twitter),
  },
  {
    key: "keywords",
    label: "Add keywords so funders can find you",
    weight: 5,
    section: "matching",
    present: (p) => Array.isArray(p.keywords) && p.keywords.filter((k) => nonEmpty(k)).length >= 3,
  },
];

function toMissing(w: Weight): MissingItem {
  return {
    key: w.key,
    label: w.label,
    weight: w.weight,
    section: w.section,
    href: editProfileHref(w.section),
  };
}

export interface CompletenessResult {
  percent: number;
  missing: MissingItem[];
}

export function computeCompleteness(p: Profile | null | undefined): CompletenessResult {
  if (!p) {
    return { percent: 0, missing: WEIGHTS.map(toMissing) };
  }

  let percent = 0;
  const missing: MissingItem[] = [];

  for (const w of WEIGHTS) {
    if (w.present(p)) {
      percent += w.weight;
    } else {
      missing.push(toMissing(w));
    }
  }

  // Highest-weight gaps first so the UI can surface the most impactful ones.
  missing.sort((a, b) => b.weight - a.weight);

  return { percent, missing };
}
