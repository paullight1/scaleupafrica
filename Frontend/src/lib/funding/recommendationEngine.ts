export type EligibilityStatus =
  | "eligible"
  | "possibly_eligible"
  | "insufficient_information"
  | "ineligible";

export interface RecommendationProfile {
  country?: string | null;
  sector?: string | null;
  keywords?: string[] | null;
  shortDescription?: string | null;
  longDescription?: string | null;
}

export interface RecommendationOpportunity {
  id?: string;
  title: string;
  funder?: string | null;
  type?: string | null;
  summary?: string | null;
  eligibility?: string | null;
  url?: string | null;
  deadline?: string | null;
  tags?: string[] | null;
  countryFocus?: string[] | null;
  featured?: boolean;
  lastVerifiedAt?: string | null;
  details?: Record<string, unknown> | null;
}

export interface RecommendationResult<T> {
  opportunity: T;
  eligibilityStatus: EligibilityStatus;
  matchScore: number;
  confidenceScore: number;
  reasons: string[];
  blockers: string[];
  missingInformation: string[];
}

const STOP_WORDS = new Set([
  "about",
  "across",
  "also",
  "and",
  "are",
  "business",
  "businesses",
  "company",
  "for",
  "from",
  "help",
  "into",
  "our",
  "platform",
  "that",
  "the",
  "their",
  "this",
  "through",
  "using",
  "with",
]);

const PAN_AFRICAN = new Set([
  "africa",
  "african",
  "pan african",
  "pan-african",
  "all",
  "all africa",
  "all african countries",
  "continent wide",
  "continent-wide",
]);

const MAX_REASON_COUNT = 5;

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCountry(value: unknown): string {
  return normalizeText(value);
}

function addDomainAliases(tokens: Set<string>): Set<string> {
  const out = new Set(tokens);
  if (out.has("agritech")) {
    out.add("agriculture");
    out.add("agricultural");
  }
  if (out.has("fintech")) {
    out.add("finance");
    out.add("financial");
  }
  if (out.has("healthtech")) out.add("health");
  if (out.has("edtech")) out.add("education");
  if (out.has("climatetech")) out.add("climate");
  return out;
}

function tokens(value: unknown): Set<string> {
  const normalized = normalizeText(value);
  const base = new Set(
    normalized
      .split(" ")
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
  );
  return addDomainAliases(base);
}

function tokenUnion(values: unknown[]): Set<string> {
  const out = new Set<string>();
  for (const value of values) {
    for (const token of tokens(value)) out.add(token);
  }
  return out;
}

function intersection(a: Set<string>, b: Set<string>): string[] {
  const out: string[] = [];
  for (const value of a) if (b.has(value)) out.push(value);
  return out;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

function detailsArrays(details: Record<string, unknown> | null | undefined): string[] {
  if (!details) return [];
  return [
    ...stringArray(details.sectors),
    ...stringArray(details.subsectors),
    ...stringArray(details.keywords),
    ...stringArray(details.sdg_focus),
    ...stringArray(details.business_stages),
  ];
}

function opportunityTokens(opportunity: RecommendationOpportunity): Set<string> {
  return tokenUnion([
    opportunity.title,
    opportunity.funder,
    opportunity.type,
    opportunity.summary,
    opportunity.eligibility,
    ...(opportunity.tags ?? []),
    ...detailsArrays(opportunity.details),
  ]);
}

function panAfrican(focus: string[]): boolean {
  return focus.some((value) => {
    const normalized = normalizeCountry(value);
    return PAN_AFRICAN.has(normalized) || /^africa(?:n)? wide$/.test(normalized);
  });
}

function roundBounded(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function eligibility(
  profile: RecommendationProfile,
  opportunity: RecommendationOpportunity,
): Pick<RecommendationResult<never>, "eligibilityStatus" | "reasons" | "blockers" | "missingInformation"> {
  const reasons: string[] = [];
  const blockers: string[] = [];
  const missingInformation: string[] = [];
  const country = normalizeCountry(profile.country);
  const focus = (opportunity.countryFocus ?? []).map(normalizeCountry).filter(Boolean);

  if (focus.length === 0) {
    if (!country) missingInformation.push("Add your operating country to strengthen eligibility checks.");
    return {
      eligibilityStatus: "possibly_eligible",
      reasons,
      blockers,
      missingInformation,
    };
  }

  if (panAfrican(focus)) {
    reasons.push("Open to businesses across Africa.");
    return {
      eligibilityStatus: "eligible",
      reasons,
      blockers,
      missingInformation,
    };
  }

  if (!country) {
    missingInformation.push("Add your operating country to confirm geographic eligibility.");
    return {
      eligibilityStatus: "insufficient_information",
      reasons,
      blockers,
      missingInformation,
    };
  }

  if (focus.includes(country)) {
    reasons.push(`${String(profile.country).trim()} is in the eligible geography.`);
    return {
      eligibilityStatus: "eligible",
      reasons,
      blockers,
      missingInformation,
    };
  }

  blockers.push(
    `${String(profile.country).trim()} is not listed in this opportunity's eligible geography.`,
  );
  return {
    eligibilityStatus: "ineligible",
    reasons,
    blockers,
    missingInformation,
  };
}

function confidenceScore(opportunity: RecommendationOpportunity, now: Date): number {
  let score = 10;

  if (opportunity.url) score += 20;
  if ((opportunity.countryFocus ?? []).length > 0) score += 15;
  if (
    String(opportunity.eligibility ?? "").trim() ||
    (opportunity.details && Object.keys(opportunity.details).length > 0)
  ) {
    score += 15;
  }

  const verifiedAt = opportunity.lastVerifiedAt
    ? new Date(opportunity.lastVerifiedAt).getTime()
    : Number.NaN;
  if (!Number.isNaN(verifiedAt)) {
    const ageDays = Math.max(0, (now.getTime() - verifiedAt) / 86_400_000);
    if (ageDays <= 7) score += 40;
    else if (ageDays <= 30) score += 25;
    else if (ageDays <= 90) score += 10;
  }

  return roundBounded(score);
}

function addScoredDimension(
  gained: { value: number },
  possible: { value: number },
  weight: number,
  ratio: number,
) {
  possible.value += weight;
  gained.value += weight * Math.max(0, Math.min(1, ratio));
}

export function recommendOpportunity<T extends RecommendationOpportunity>(
  profile: RecommendationProfile,
  opportunity: T,
  now = new Date(),
): RecommendationResult<T> {
  const eligibilityResult = eligibility(profile, opportunity);
  const reasons = [...eligibilityResult.reasons];
  const blockers = [...eligibilityResult.blockers];
  const missingInformation = [...eligibilityResult.missingInformation];

  if (eligibilityResult.eligibilityStatus === "ineligible") {
    return {
      opportunity,
      eligibilityStatus: "ineligible",
      matchScore: 0,
      confidenceScore: confidenceScore(opportunity, now),
      reasons,
      blockers,
      missingInformation,
    };
  }

  const gained = { value: 0 };
  const possible = { value: 0 };
  const oppTokens = opportunityTokens(opportunity);

  const profileCountry = normalizeCountry(profile.country);
  if (profileCountry) {
    addScoredDimension(gained, possible, 30, 1);
  }

  const sectorTokens = tokens(profile.sector);
  if (sectorTokens.size > 0) {
    const matches = intersection(sectorTokens, oppTokens);
    addScoredDimension(gained, possible, 25, matches.length / sectorTokens.size);
    if (matches.length > 0) {
      reasons.push(`${String(profile.sector).trim()} aligns with this program's focus.`);
    }
  } else {
    missingInformation.push("Add your business sector to improve match quality.");
  }

  const keywordTokens = tokenUnion(profile.keywords ?? []);
  if (keywordTokens.size > 0) {
    const matches = intersection(keywordTokens, oppTokens);
    addScoredDimension(gained, possible, 25, matches.length / keywordTokens.size);
    if (matches.length > 0) {
      reasons.push(`Matches your ${matches.slice(0, 3).join(", ")} interests.`);
    }
  }

  const descriptionTokens = tokenUnion([
    profile.shortDescription,
    profile.longDescription,
  ]);
  if (descriptionTokens.size > 0) {
    const matches = intersection(descriptionTokens, oppTokens);
    const denominator = Math.max(1, Math.min(descriptionTokens.size, 8));
    addScoredDimension(gained, possible, 20, matches.length / denominator);
    if (matches.length > 0) {
      reasons.push(`Your business description overlaps on ${matches.slice(0, 3).join(", ")}.`);
    }
  }

  if (keywordTokens.size === 0 && descriptionTokens.size === 0) {
    missingInformation.push("Add business keywords or a description to improve matching.");
  }

  const matchScore = possible.value > 0
    ? roundBounded((gained.value / possible.value) * 100)
    : 0;

  return {
    opportunity,
    eligibilityStatus: eligibilityResult.eligibilityStatus,
    matchScore,
    confidenceScore: confidenceScore(opportunity, now),
    reasons: Array.from(new Set(reasons)).slice(0, MAX_REASON_COUNT),
    blockers: Array.from(new Set(blockers)),
    missingInformation: Array.from(new Set(missingInformation)),
  };
}

const ELIGIBILITY_RANK: Record<EligibilityStatus, number> = {
  eligible: 3,
  possibly_eligible: 2,
  insufficient_information: 1,
  ineligible: 0,
};

export function rankRecommendations<T extends RecommendationOpportunity>(
  profile: RecommendationProfile | null | undefined,
  opportunities: T[],
  now = new Date(),
): RecommendationResult<T>[] {
  if (!profile || opportunities.length === 0) return [];

  return opportunities
    .map((opportunity, index) => ({
      result: recommendOpportunity(profile, opportunity, now),
      index,
    }))
    .filter(
      ({ result }) =>
        result.eligibilityStatus !== "ineligible" && result.matchScore > 0,
    )
    .sort((a, b) => {
      const eligibilityDiff =
        ELIGIBILITY_RANK[b.result.eligibilityStatus] -
        ELIGIBILITY_RANK[a.result.eligibilityStatus];
      if (eligibilityDiff) return eligibilityDiff;
      if (b.result.matchScore !== a.result.matchScore) {
        return b.result.matchScore - a.result.matchScore;
      }
      if (b.result.confidenceScore !== a.result.confidenceScore) {
        return b.result.confidenceScore - a.result.confidenceScore;
      }
      const featuredDiff = Number(Boolean(b.result.opportunity.featured)) - Number(Boolean(a.result.opportunity.featured));
      return featuredDiff || a.index - b.index;
    })
    .map(({ result }) => result);
}
