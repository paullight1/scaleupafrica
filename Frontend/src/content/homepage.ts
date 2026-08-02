import type { Stat, Testimonial } from "@shared/components/marketing";
import type { DirectoryCardRow } from "@/hooks/queries/directory";
import type { Opportunity } from "@/lib/fundingSchema";

/**
 * Every piece of homepage content the business owns, in one file.
 *
 * Empty arrays are a deliberate state, not an oversight: `StatBand` and
 * `Testimonials` render `null` when empty, and the section map is composed to
 * look complete without them. Fill these in when real figures exist — do not
 * ship placeholder numbers or invented quotes on a funding platform.
 */

export const STATS: Stat[] = [];

export const TESTIMONIALS: Testimonial[] = [];

/**
 * Sample rows for the directory preview. These are illustrative businesses,
 * NOT real listings, and the `BrowserFrame` renders them inert — the slugs
 * deliberately do not resolve to real `/directory/:slug` routes.
 */
export const SAMPLE_PROFILES: DirectoryCardRow[] = [
  {
    id: "sample-1",
    slug: "sample-solar",
    business_name: "Kilima Solar",
    founder_name: "Amara Njeri",
    logo_url: null,
    country: "Kenya",
    sector: "Clean Energy",
    short_description:
      "Pay-as-you-go solar kits for off-grid households and small shops across the Rift Valley.",
    featured: true,
    created_at: "2026-01-12T09:00:00.000Z",
  },
  {
    id: "sample-2",
    slug: "sample-agro",
    business_name: "Sahel Agro Works",
    founder_name: "Ibrahim Diallo",
    logo_url: null,
    country: "Senegal",
    sector: "Agriculture",
    short_description:
      "Cold-chain storage and aggregation for smallholder vegetable farmers supplying Dakar markets.",
    featured: false,
    created_at: "2026-02-03T09:00:00.000Z",
  },
  {
    id: "sample-3",
    slug: "sample-logistics",
    business_name: "Ndu Logistics",
    founder_name: "Chinelo Okafor",
    logo_url: null,
    country: "Nigeria",
    sector: "Logistics",
    short_description:
      "Last-mile delivery for online retailers in Lagos and Port Harcourt, with same-day coverage.",
    featured: false,
    created_at: "2026-02-20T09:00:00.000Z",
  },
];

/** One illustrative funding call for the preview. Not a live opportunity. */
export const SAMPLE_OPPORTUNITY: Opportunity = {
  title: "Africa Agri-Processing Growth Fund",
  funder: "Continental Development Facility",
  type: "Grant",
  summary:
    "Working-capital grants for SMEs processing locally grown produce, with technical assistance over an 18-month period.",
  amount: "$25,000 – $150,000",
  opens: "Rolling",
  deadline: "Quarterly review",
  eligibility: "Registered SMEs operating in an African market for 2+ years",
  url: null,
  tags: ["Agriculture", "Processing", "Working capital"],
  sdg_focus: [],
  past_recipients: [],
  application_tips: [],
};

/** Reassurance section. Both columns are the same length on purpose — neither is subordinate. */
export const REASSURANCE_DOES: string[] = [
  "Puts your business in front of buyers, partners and funders",
  "Tracks live funding calls across African markets",
  "Curates them to your sector and stage",
];

export const REASSURANCE_DOESNT: string[] = [
  "Provide grants or loans directly",
  "Write or submit applications for you",
  "Guarantee that you win any funding",
];

export type DisclaimerPoint = { title: string; description: string };

/** The five points, verbatim from the retired landing/Disclaimer.tsx. Do not soften. */
export const DISCLAIMER_POINTS: DisclaimerPoint[] = [
  {
    title: "We Are Not a Funding Organization",
    description:
      "The Cresciva Collective is an educational and networking membership. We do not provide grants, loans, or direct funding of any kind.",
  },
  {
    title: "No Guarantee of Grant Success",
    description:
      "While we provide curated information about funding opportunities, we cannot and do not guarantee that any member will receive a grant or funding. Success depends on many factors beyond our control.",
  },
  {
    title: "We Do Not Write Applications",
    description:
      "Our team does not write, edit, or submit grant applications on behalf of members. We provide information and guidance, but the application process remains your responsibility.",
  },
  {
    title: "Directory Listings Are Member-Provided",
    description:
      "SME Directory profiles are created and maintained by members themselves. We do not verify, endorse, or guarantee the accuracy of any business listed. Do your own due diligence before transacting.",
  },
  {
    title: "Information Accuracy",
    description:
      "We strive to provide accurate and timely information about funding opportunities. However, details change frequently, and members should always verify information directly with funding sources.",
  },
];

export const DISCLAIMER_SUMMARY =
  "We are your supportive partner in the scaling journey, providing visibility through the directory and curated capital intelligence. The work of building and funding your business remains yours.";
