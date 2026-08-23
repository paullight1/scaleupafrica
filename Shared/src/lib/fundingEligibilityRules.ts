export type EligibilityGeographyScope = "global" | "pan_african" | "countries" | "unknown";
export type EligibilityBusinessStage = "idea" | "early" | "growth" | "scale";
export type EligibilityEntityType = "nonprofit" | "for_profit" | "social_enterprise" | "cooperative" | "academic" | "government";

export interface FundingEligibilityQuoteSignals {
  geographyQuotes: string[];
  stageQuotes: string[];
  entityTypeQuotes: string[];
  companyAgeQuotes: string[];
}

export interface FundingEligibilityRules {
  geographyScope: EligibilityGeographyScope;
  eligibleCountries: string[];
  businessStages: EligibilityBusinessStage[];
  entityTypes: EligibilityEntityType[];
  minCompanyAgeYears: number | null;
  maxCompanyAgeYears: number | null;
}

export interface FundingEligibilityDerivation {
  rules: FundingEligibilityRules;
  evidence: FundingEligibilityQuoteSignals;
}

const AFRICAN_COUNTRIES = [
  "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde","Cameroon","Central African Republic","Chad","Comoros","Democratic Republic of the Congo","Republic of the Congo","Cote d'Ivoire","Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini","Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda","Sao Tome and Principe","Senegal","Seychelles","Sierra Leone","Somalia","South Africa","South Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe",
] as const;

const COUNTRY_ALIASES: Record<string, string[]> = {
  "Cabo Verde": ["cape verde"],
  "Cote d'Ivoire": ["cote d ivoire", "côte d'ivoire", "ivory coast"],
  "Democratic Republic of the Congo": ["democratic republic of congo", "drc", "dr congo"],
  "Republic of the Congo": ["republic of congo", "congo brazzaville"],
  "Eswatini": ["swaziland"],
  "Sao Tome and Principe": ["sao tome and principe", "são tomé and príncipe"],
  "Tanzania": ["united republic of tanzania"],
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function normalize(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function phrasePresent(text: string, phrase: string): boolean {
  return new RegExp(`(?:^|\\b)${normalize(phrase).replace(/\s+/g, "\\s+")}(?:\\b|$)`).test(text);
}

function countriesFromQuotes(quotes: string[]): string[] {
  const found: string[] = [];
  for (const quote of quotes) {
    const text = normalize(quote);
    for (const country of AFRICAN_COUNTRIES) {
      const variants = [country, ...(COUNTRY_ALIASES[country] ?? [])];
      if (variants.some((variant) => phrasePresent(text, variant))) found.push(country);
    }
  }
  return unique(found);
}

function geographyScope(quotes: string[], countries: string[]): EligibilityGeographyScope {
  const text = quotes.map(normalize).join(" ");
  if (/\b(worldwide|globally|global applicants|all countries|any country|anywhere in the world)\b/.test(text)) return "global";
  // Deliberately exclude broad regional phrases such as Sub-Saharan Africa unless
  // the source explicitly says African/Africa-wide/Pan-African eligibility.
  if (/\b(pan african|africa wide|across africa|african businesses|african organisations|african organizations|applicants from africa|africa based)\b/.test(text)) return "pan_african";
  return countries.length ? "countries" : "unknown";
}

function stagesFromQuotes(quotes: string[]): EligibilityBusinessStage[] {
  const text = quotes.map(normalize).join(" ");
  const out: EligibilityBusinessStage[] = [];
  if (/\b(idea stage|idea phase|concept stage|pre seed|preseed)\b/.test(text)) out.push("idea");
  if (/\b(early stage|early stage venture|seed stage|seed stage venture)\b/.test(text)) out.push("early");
  if (/\b(growth stage|growth stage venture|growth company)\b/.test(text)) out.push("growth");
  if (/\b(scale stage|scale up|scaleup|scaling stage|scale stage venture)\b/.test(text)) out.push("scale");
  return unique(out);
}

function entityTypesFromQuotes(quotes: string[]): EligibilityEntityType[] {
  const text = quotes.map(normalize).join(" ");
  const out: EligibilityEntityType[] = [];
  if (/\b(non profit|nonprofit|not for profit|ngo|non governmental organization|non governmental organisation|charity)\b/.test(text)) out.push("nonprofit");
  if (/\b(for profit|for profit company|private company|private sector|sme|small and medium enterprise|small or medium enterprise|startup company)\b/.test(text)) out.push("for_profit");
  if (/\bsocial enterprise\b/.test(text)) out.push("social_enterprise");
  if (/\b(cooperative|co op|coop)\b/.test(text)) out.push("cooperative");
  if (/\b(university|academic institution|research institution)\b/.test(text)) out.push("academic");
  if (/\b(government agency|public agency|government institution|public institution)\b/.test(text)) out.push("government");
  return unique(out);
}

function numericToken(raw: string): number | null {
  const normalized = raw.toLowerCase();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return NUMBER_WORDS[normalized] ?? null;
}

function companyAgeFromQuotes(quotes: string[]): { min: number | null; max: number | null } {
  let min: number | null = null;
  let max: number | null = null;
  for (const quote of quotes) {
    const text = normalize(quote);
    const between = text.match(/\bbetween\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:and|to)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+years?\b/);
    if (between) {
      const low = numericToken(between[1]);
      const high = numericToken(between[2]);
      if (low !== null && high !== null && low <= high) { min = min === null ? low : Math.max(min, low); max = max === null ? high : Math.min(max, high); }
    }
    const minimum = text.match(/\b(?:at least|minimum(?: of)?|minimum age(?: of)?|operated for at least|operating for at least)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+years?\b/);
    if (minimum) {
      const value = numericToken(minimum[1]);
      if (value !== null) min = min === null ? value : Math.max(min, value);
    }
    const maximum = text.match(/\b(?:at most|no more than|maximum(?: of)?|maximum age(?: of)?|operated for no more than|operating for no more than)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+years?\b/);
    if (maximum) {
      const value = numericToken(maximum[1]);
      if (value !== null) max = max === null ? value : Math.min(max, value);
    }
  }
  if (min !== null && max !== null && min > max) return { min: null, max: null };
  return { min, max };
}

function sanitizeQuotes(values: string[]): string[] {
  return unique(values.map((value) => value.trim()).filter(Boolean)).slice(0, 10);
}

export function deriveFundingEligibilityRules(signals: FundingEligibilityQuoteSignals): FundingEligibilityDerivation {
  const evidence: FundingEligibilityQuoteSignals = {
    geographyQuotes: sanitizeQuotes(signals.geographyQuotes),
    stageQuotes: sanitizeQuotes(signals.stageQuotes),
    entityTypeQuotes: sanitizeQuotes(signals.entityTypeQuotes),
    companyAgeQuotes: sanitizeQuotes(signals.companyAgeQuotes),
  };
  const eligibleCountries = countriesFromQuotes(evidence.geographyQuotes);
  const age = companyAgeFromQuotes(evidence.companyAgeQuotes);
  return {
    rules: {
      geographyScope: geographyScope(evidence.geographyQuotes, eligibleCountries),
      eligibleCountries,
      businessStages: stagesFromQuotes(evidence.stageQuotes),
      entityTypes: entityTypesFromQuotes(evidence.entityTypeQuotes),
      minCompanyAgeYears: age.min,
      maxCompanyAgeYears: age.max,
    },
    evidence,
  };
}
