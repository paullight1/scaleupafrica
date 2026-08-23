import { effectiveFundingStatus, isStatusFresh } from "../../../../Shared/src/lib/fundingStatus.ts";
import { effectiveFundingVerificationStatus } from "../../../../Shared/src/lib/fundingTrust.ts";

export type EligibilityStatus = "eligible" | "possibly_eligible" | "insufficient_information" | "ineligible";
export type ApplicationReadiness = "exploring" | "preparing" | "ready";
export type OpportunityVerificationStatus = "verified" | "stale" | "unverified";
export type OpportunityApplicationStatus = "open" | "closing_soon" | "rolling" | "upcoming" | "closed" | "paused" | "unknown";
export type OpportunityDeadlineStatus = "confirmed" | "rolling" | "unknown";

export interface RecommendationProfile {
  country?: string | null;
  operatingCountries?: string[] | null;
  organisationType?: string | null;
  foundingYear?: number | null;
  sector?: string | null;
  keywords?: string[] | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  businessStage?: string | null;
  preferredFundingTypes?: string[] | null;
  fundingTargetUsd?: number | null;
  applicationReadiness?: ApplicationReadiness | null;
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
  sourceUrl?: string | null;
  verificationStatus?: OpportunityVerificationStatus | null;
  applicationStatus?: OpportunityApplicationStatus | null;
  statusCheckedAt?: string | null;
  statusEvidenceUrl?: string | null;
  opensAt?: string | null;
  deadlineAt?: string | null;
  deadlineTimezone?: string | null;
  deadlineStatus?: OpportunityDeadlineStatus | null;
  currentCycleLabel?: string | null;
  applicationUrl?: string | null;
  details?: Record<string, unknown> | null;
}

export interface RecommendationResult<T> {
  opportunity: T;
  eligibilityStatus: EligibilityStatus;
  matchScore: number;
  confidenceScore: number;
  readinessScore: number;
  applicationStatus: OpportunityApplicationStatus;
  applicationStatusFresh: boolean;
  primaryApplyEligible: boolean;
  reasons: string[];
  blockers: string[];
  missingInformation: string[];
}

const STOP_WORDS = new Set(["about","across","also","and","are","business","businesses","company","for","from","help","into","our","platform","that","the","their","this","through","using","with"]);
const PAN_AFRICAN = new Set(["africa","african","pan african","pan-african","all","all africa","all african countries","continent wide","continent-wide"]);
const MAX_REASON_COUNT = 6;

function normalizeText(value: unknown): string {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeCountry(value: unknown): string {
  const normalized = normalizeText(value);
  const aliases: Record<string, string> = { nigerian:"nigeria", kenyan:"kenya", ghanaian:"ghana", ugandan:"uganda", rwandan:"rwanda", tanzanian:"tanzania", zambian:"zambia", zimbabwean:"zimbabwe" };
  return aliases[normalized] ?? normalized;
}

function profileCountries(profile: RecommendationProfile): string[] {
  return Array.from(new Set([profile.country, ...(profile.operatingCountries ?? [])].map(normalizeCountry).filter(Boolean)));
}

function addDomainAliases(values: Set<string>): Set<string> {
  const out = new Set(values);
  if (out.has("agritech")) { out.add("agriculture"); out.add("agricultural"); }
  if (out.has("fintech")) { out.add("finance"); out.add("financial"); }
  if (out.has("healthtech")) out.add("health");
  if (out.has("edtech")) out.add("education");
  if (out.has("climatetech")) out.add("climate");
  return out;
}

function tokens(value: unknown): Set<string> {
  const normalized = normalizeText(value);
  return addDomainAliases(new Set(normalized.split(" ").filter((token) => token.length >= 3 && !STOP_WORDS.has(token))));
}
function tokenUnion(values: unknown[]): Set<string> { const out=new Set<string>(); for(const value of values) for(const token of tokens(value)) out.add(token); return out; }
function intersection(a:Set<string>,b:Set<string>):string[]{const out:string[]=[];for(const value of a)if(b.has(value))out.push(value);return out;}
function stringArray(value:unknown):string[]{return Array.isArray(value)?value.map((item)=>String(item??"").trim()).filter(Boolean):[];}
function detailsArrays(details:Record<string,unknown>|null|undefined):string[]{if(!details)return[];return[...stringArray(details.sectors),...stringArray(details.subsectors),...stringArray(details.keywords),...stringArray(details.sdg_focus),...stringArray(details.business_stages),...stringArray(details.entity_types),...stringArray(details.organisation_types)];}
function numberValue(value:unknown):number|null{if(typeof value==="number"&&Number.isFinite(value))return value;if(typeof value==="string"&&value.trim()){const parsed=Number(value.replace(/,/g,""));return Number.isFinite(parsed)?parsed:null;}return null;}
function opportunityTokens(opportunity:RecommendationOpportunity):Set<string>{return tokenUnion([opportunity.title,opportunity.funder,opportunity.type,opportunity.summary,opportunity.eligibility,...(opportunity.tags??[]),...detailsArrays(opportunity.details)]);}
function panAfrican(focus:string[]):boolean{return focus.some((value)=>{const normalized=normalizeCountry(value);return PAN_AFRICAN.has(normalized)||/^africa(?:n)? wide$/.test(normalized);});}
function roundBounded(value:number):number{return Math.max(0,Math.min(100,Math.round(value)));}
function readinessScore(profile:RecommendationProfile):number{switch(profile.applicationReadiness){case"ready":return 90;case"preparing":return 60;case"exploring":return 25;default:return 0;}}

function canonicalOrganisationType(value: unknown, allowFallback = false): string {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  if (/\bsocial enterprise\b/.test(normalized)) return "social_enterprise";
  if (/\b(non profit|nonprofit|not for profit|ngo|non governmental|charity|foundation|public benefit)\b/.test(normalized)) return "nonprofit";
  if (/\b(cooperative|co op|coop)\b/.test(normalized)) return "cooperative";
  if (/\b(university|academic|research institution)\b/.test(normalized)) return "academic";
  if (/\b(government|public agency|government agency)\b/.test(normalized)) return "government";
  if (/\b(for profit|startup|sme|small medium enterprise|company|business|private sector|limited|ltd|llc|sole proprietor)\b/.test(normalized)) return "for_profit";
  return allowFallback ? normalized.replace(/\s+/g, "_") : "";
}

function explicitEntityTypes(details: Record<string, unknown> | null | undefined): string[] {
  if (!details) return [];
  return Array.from(new Set([
    ...stringArray(details.entity_types),
    ...stringArray(details.organisation_types),
    ...stringArray(details.eligible_entity_types),
  ].map((value)=>canonicalOrganisationType(value,true)).filter(Boolean)));
}

function markInsufficient(status: EligibilityStatus): EligibilityStatus {
  return status === "ineligible" ? status : "insufficient_information";
}

function eligibility(
  profile: RecommendationProfile,
  opportunity: RecommendationOpportunity,
  now: Date,
): Pick<RecommendationResult<never>, "eligibilityStatus"|"reasons"|"blockers"|"missingInformation"> {
  const reasons:string[]=[]; const blockers:string[]=[]; const missingInformation:string[]=[];
  const countries=profileCountries(profile);
  const focus=(opportunity.countryFocus??[]).map(normalizeCountry).filter(Boolean);
  let status:EligibilityStatus="possibly_eligible";

  if(focus.length===0){
    if(countries.length===0)missingInformation.push("Add your operating country to strengthen eligibility checks.");
  }else if(panAfrican(focus)){
    if(countries.length===0){missingInformation.push("Add your operating country to confirm Pan-African geographic eligibility.");status="insufficient_information";}
    else{reasons.push("Open to organisations operating across Africa.");status="eligible";}
  }else if(countries.length===0){
    missingInformation.push("Add your operating country to confirm geographic eligibility."); status="insufficient_information";
  }else{
    const matched=focus.find((country)=>countries.includes(country));
    if(matched){reasons.push(`${matched.replace(/\b\w/g,(char)=>char.toUpperCase())} is in the eligible geography.`);status="eligible";}
    else{
      blockers.push(`None of your confirmed operating countries (${countries.join(", ")}) are listed in this opportunity's eligible geography.`);
      return{eligibilityStatus:"ineligible",reasons,blockers,missingInformation};
    }
  }

  const explicitStages=stringArray(opportunity.details?.business_stages).map(normalizeText).filter(Boolean);
  const memberStage=normalizeText(profile.businessStage);
  if(explicitStages.length>0&&memberStage){
    if(!explicitStages.includes(memberStage)){blockers.push(`Your ${String(profile.businessStage).trim()} business stage is outside this program's stated stage eligibility.`);return{eligibilityStatus:"ineligible",reasons,blockers,missingInformation};}
    reasons.push(`${String(profile.businessStage).trim()} stage matches the program's stated eligibility.`);
  }else if(explicitStages.length>0&&!memberStage){
    missingInformation.push("Add your business stage to confirm stage eligibility."); status=markInsufficient(status);
  }

  const entityTypes=explicitEntityTypes(opportunity.details);
  if(entityTypes.length>0){
    const memberEntity=canonicalOrganisationType(profile.organisationType);
    if(!memberEntity){missingInformation.push("Add your organisation/entity type to confirm legal-entity eligibility.");status=markInsufficient(status);}
    else if(!entityTypes.includes(memberEntity)){blockers.push(`Your organisation/entity type does not match this program's stated entity eligibility.`);return{eligibilityStatus:"ineligible",reasons,blockers,missingInformation};}
    else reasons.push("Your organisation type matches the program's stated eligibility.");
  }

  const minAge=numberValue(opportunity.details?.min_company_age_years);
  const maxAge=numberValue(opportunity.details?.max_company_age_years);
  if(minAge!==null||maxAge!==null){
    const foundingYear=numberValue(profile.foundingYear);
    const currentYear=now.getUTCFullYear();
    if(foundingYear===null||!Number.isInteger(foundingYear)||foundingYear<1800||foundingYear>currentYear){
      missingInformation.push("Add a valid founding year/date to confirm company-age eligibility."); status=markInsufficient(status);
    }else{
      const maxPossibleAge=Math.max(0,currentYear-foundingYear);
      const minPossibleAge=Math.max(0,maxPossibleAge-1);
      if(minAge!==null&&maxPossibleAge<minAge){blockers.push(`Your organisation is definitely younger than the required ${minAge} years.`);return{eligibilityStatus:"ineligible",reasons,blockers,missingInformation};}
      if(maxAge!==null&&minPossibleAge>maxAge){blockers.push(`Your organisation is definitely older than the allowed ${maxAge} years.`);return{eligibilityStatus:"ineligible",reasons,blockers,missingInformation};}
      const minBoundary=minAge!==null&&minPossibleAge<minAge&&maxPossibleAge>=minAge;
      const maxBoundary=maxAge!==null&&minPossibleAge<=maxAge&&maxPossibleAge>maxAge;
      if(minBoundary||maxBoundary){missingInformation.push("Add the exact founding date to resolve a company age eligibility boundary.");status=markInsufficient(status);}
      else reasons.push("Your organisation age satisfies the program's stated age rule.");
    }
  }

  return{eligibilityStatus:status,reasons,blockers,missingInformation};
}

function confidenceScore(opportunity:RecommendationOpportunity,now:Date):number{
  let score=10;const hasSourceEvidence=Boolean(opportunity.sourceUrl);if(hasSourceEvidence)score+=25;if((opportunity.countryFocus??[]).length>0)score+=15;
  if(String(opportunity.eligibility??"").trim()||(opportunity.details&&Object.keys(opportunity.details).length>0))score+=15;
  const effectiveVerification=effectiveFundingVerificationStatus(opportunity.verificationStatus,opportunity.sourceUrl,opportunity.lastVerifiedAt,now);
  if(hasSourceEvidence&&effectiveVerification==="verified")score+=35;else if(hasSourceEvidence&&effectiveVerification==="stale")score+=10;
  return roundBounded(score);
}
function addScoredDimension(gained:{value:number},possible:{value:number},weight:number,ratio:number){possible.value+=weight;gained.value+=weight*Math.max(0,Math.min(1,ratio));}

export function recommendOpportunity<T extends RecommendationOpportunity>(profile:RecommendationProfile,opportunity:T,now=new Date()):RecommendationResult<T>{
  const eligibilityResult=eligibility(profile,opportunity,now);const reasons=[...eligibilityResult.reasons];const blockers=[...eligibilityResult.blockers];const missingInformation=[...eligibilityResult.missingInformation];const readiness=readinessScore(profile);
  const storedApplicationStatus=opportunity.applicationStatus??"unknown";const applicationStatusFresh=isStatusFresh(storedApplicationStatus,opportunity.statusCheckedAt,now);const applicationStatus=effectiveFundingStatus(storedApplicationStatus,opportunity.statusCheckedAt,now);
  const effectiveVerification=effectiveFundingVerificationStatus(opportunity.verificationStatus,opportunity.sourceUrl,opportunity.lastVerifiedAt,now);const sourceVerified=effectiveVerification==="verified";
  if(eligibilityResult.eligibilityStatus==="ineligible")return{opportunity,eligibilityStatus:"ineligible",matchScore:0,confidenceScore:confidenceScore(opportunity,now),readinessScore:readiness,applicationStatus,applicationStatusFresh,primaryApplyEligible:false,reasons,blockers,missingInformation};

  const gained={value:0},possible={value:0},oppTokens=opportunityTokens(opportunity);
  const countries=profileCountries(profile);const focus=(opportunity.countryFocus??[]).map(normalizeCountry).filter(Boolean);
  if(countries.length>0&&focus.length>0&&(panAfrican(focus)||focus.some((country)=>countries.includes(country))))addScoredDimension(gained,possible,25,1);

  const sectorTokens=tokens(profile.sector);if(sectorTokens.size>0){const matches=intersection(sectorTokens,oppTokens);addScoredDimension(gained,possible,20,matches.length/sectorTokens.size);if(matches.length>0)reasons.push(`${String(profile.sector).trim()} aligns with this program's focus.`);}else missingInformation.push("Add your business sector to improve match quality.");
  const keywordTokens=tokenUnion(profile.keywords??[]);if(keywordTokens.size>0){const matches=intersection(keywordTokens,oppTokens);addScoredDimension(gained,possible,20,matches.length/keywordTokens.size);if(matches.length>0)reasons.push(`Matches your ${matches.slice(0,3).join(", ")} interests.`);}
  const descriptionTokens=tokenUnion([profile.shortDescription,profile.longDescription]);if(descriptionTokens.size>0){const matches=intersection(descriptionTokens,oppTokens),denominator=Math.max(1,Math.min(descriptionTokens.size,8));addScoredDimension(gained,possible,15,matches.length/denominator);if(matches.length>0)reasons.push(`Your business description overlaps on ${matches.slice(0,3).join(", ")}.`);}
  const memberStage=normalizeText(profile.businessStage),explicitStages=stringArray(opportunity.details?.business_stages).map(normalizeText).filter(Boolean);if(memberStage&&explicitStages.length>0)addScoredDimension(gained,possible,10,explicitStages.includes(memberStage)?1:0);
  const preferredTypes=(profile.preferredFundingTypes??[]).map(normalizeText).filter(Boolean),opportunityType=normalizeText(opportunity.type);if(preferredTypes.length>0&&opportunityType){const typeMatched=preferredTypes.some((type)=>opportunityType.includes(type)||type.includes(opportunityType));addScoredDimension(gained,possible,5,typeMatched?1:0);if(typeMatched)reasons.push(`${String(opportunity.type).trim()} matches your preferred funding type.`);}
  const fundingTarget=numberValue(profile.fundingTargetUsd),minAward=numberValue(opportunity.details?.min_award_usd),maxAward=numberValue(opportunity.details?.max_award_usd);if(fundingTarget&&(minAward!==null||maxAward!==null)){const amountMatched=(minAward===null||fundingTarget>=minAward)&&(maxAward===null||fundingTarget<=maxAward);addScoredDimension(gained,possible,5,amountMatched?1:0);if(amountMatched)reasons.push("Your funding target is inside the program's stated award range.");else missingInformation.push("Your funding target is outside this program's stated award range; review the amount before applying.");}
  if(keywordTokens.size===0&&descriptionTokens.size===0)missingInformation.push("Add business keywords or a description to improve matching.");
  if(!profile.businessStage)missingInformation.push("Add your business stage to improve funding eligibility checks.");
  if(!profile.applicationReadiness)missingInformation.push("Add your application readiness to receive preparation guidance.");

  const matchScore=possible.value>0?roundBounded((gained.value/possible.value)*100):0;
  const primaryApplyEligible=sourceVerified&&applicationStatusFresh&&eligibilityResult.eligibilityStatus==="eligible"&&(applicationStatus==="open"||applicationStatus==="closing_soon"||applicationStatus==="rolling");
  return{opportunity,eligibilityStatus:eligibilityResult.eligibilityStatus,matchScore,confidenceScore:confidenceScore(opportunity,now),readinessScore:readiness,applicationStatus,applicationStatusFresh,primaryApplyEligible,reasons:Array.from(new Set(reasons)).slice(0,MAX_REASON_COUNT),blockers:Array.from(new Set(blockers)),missingInformation:Array.from(new Set(missingInformation))};
}

const ELIGIBILITY_RANK:Record<EligibilityStatus,number>={eligible:3,possibly_eligible:2,insufficient_information:1,ineligible:0};
export function rankRecommendations<T extends RecommendationOpportunity>(profile:RecommendationProfile|null|undefined,opportunities:T[],now=new Date()):RecommendationResult<T>[] {
  if(!profile||opportunities.length===0)return[];
  return opportunities.map((opportunity,index)=>({result:recommendOpportunity(profile,opportunity,now),index})).filter(({result})=>result.eligibilityStatus!=="ineligible"&&result.matchScore>0).sort((a,b)=>{const eligibilityDiff=ELIGIBILITY_RANK[b.result.eligibilityStatus]-ELIGIBILITY_RANK[a.result.eligibilityStatus];if(eligibilityDiff)return eligibilityDiff;if(b.result.matchScore!==a.result.matchScore)return b.result.matchScore-a.result.matchScore;if(b.result.confidenceScore!==a.result.confidenceScore)return b.result.confidenceScore-a.result.confidenceScore;const featuredDiff=Number(Boolean(b.result.opportunity.featured))-Number(Boolean(a.result.opportunity.featured));return featuredDiff||a.index-b.index;}).map(({result})=>result);
}
