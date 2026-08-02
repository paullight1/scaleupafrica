import type { MissingItem, Profile } from "./types";

/**
 * Deterministic profile-completeness score. Weights sum to 100 (see plan 03 §2.4).
 * A field counts when non-empty (trimmed). A null profile scores 0 with every
 * item missing. Each MissingItem deep-links into the create-profile form anchor.
 */

const CREATE_PATH = "/directory/create";

type Weight = {
  key: string;
  label: string;
  weight: number;
  anchor: string;
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
    anchor: "basics",
    present: (p) => nonEmpty(p.business_name) && nonEmpty(p.country) && nonEmpty(p.sector),
  },
  {
    key: "short_description",
    label: "Add a short tagline",
    weight: 10,
    anchor: "short-description",
    present: (p) => nonEmpty(p.short_description),
  },
  {
    key: "long_description",
    label: "Tell your story",
    weight: 15,
    anchor: "long-description",
    present: (p) => nonEmpty(p.long_description),
  },
  {
    key: "logo_url",
    label: "Add a logo — profiles with logos get noticed",
    weight: 15,
    anchor: "logo",
    present: (p) => nonEmpty(p.logo_url),
  },
  {
    key: "founder_name",
    label: "Add the founder's name",
    weight: 5,
    anchor: "founder",
    present: (p) => nonEmpty(p.founder_name),
  },
  {
    key: "founder_photo_url",
    label: "Add a founder photo",
    weight: 10,
    anchor: "founder-photo",
    present: (p) => nonEmpty(p.founder_photo_url),
  },
  {
    key: "website",
    label: "Add your website",
    weight: 10,
    anchor: "website",
    present: (p) => nonEmpty(p.website),
  },
  {
    key: "contact",
    label: "Add a contact method (email, phone or WhatsApp)",
    weight: 10,
    anchor: "contact",
    present: (p) => nonEmpty(p.email) || nonEmpty(p.phone) || nonEmpty(p.whatsapp),
  },
  {
    key: "social",
    label: "Link a social profile",
    weight: 5,
    anchor: "social",
    present: (p) => nonEmpty(p.instagram) || nonEmpty(p.linkedin) || nonEmpty(p.twitter),
  },
  {
    key: "keywords",
    label: "Add keywords so funders can find you",
    weight: 5,
    anchor: "keywords",
    present: (p) => Array.isArray(p.keywords) && p.keywords.filter((k) => nonEmpty(k)).length >= 3,
  },
];

function toMissing(w: Weight): MissingItem {
  return { key: w.key, label: w.label, weight: w.weight, href: `${CREATE_PATH}#${w.anchor}` };
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
