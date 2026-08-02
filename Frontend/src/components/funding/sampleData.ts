import { parseOpportunities, type Opportunity } from "@/lib/fundingSchema";

/**
 * Clearly-labelled EXAMPLE opportunities shown inside the paywall so a visitor can
 * see the shape of the product honestly (this replaces the old `?preview=1` mode).
 * Run through the same schema so they are guaranteed to conform to Opportunity.
 */
export const SAMPLE_OPPS: Opportunity[] = parseOpportunities([
  {
    title: "Africa Climate Innovation Grant",
    funder: "Green Africa Foundation",
    type: "Grant",
    summary:
      "Non-dilutive grant for climate-focused African SMEs building scalable solutions in agriculture, energy or water.",
    amount: "Up to $50,000",
    opens: "January (annual)",
    deadline: "31 March (annual)",
    eligibility: "Revenue-generating SMEs in Africa",
    url: "https://example.com",
    tags: ["Grant", "Climate"],
    funder_about: "A sample foundation supporting climate innovation across Africa.",
    sdg_focus: ["SDG 13: Climate Action", "SDG 7: Affordable Energy"],
    past_recipients: [],
    application_tips: [
      "Lead with measurable climate impact",
      "Show a clear path to scale",
      "Include local partnerships",
    ],
    important_notes: "Example data — this is what a live curated opportunity looks like for members.",
  },
  {
    title: "Mandela Washington Fellowship",
    funder: "U.S. Department of State",
    type: "Fellowship",
    summary:
      "Flagship fellowship of the Young African Leaders Initiative (YALI) with a 6-week U.S. leadership institute.",
    amount: "Fully funded",
    opens: "September (annual)",
    deadline: "Early October (annual)",
    eligibility: "Africans aged 25-35",
    url: "https://example.com",
    tags: ["Fellowship", "Travel", "Leadership"],
    travel_component:
      "6 weeks in the U.S. at a host university plus optional professional development experience.",
    application_tips: [
      "Tell a specific story of community impact",
      "Be concrete about your growth goals",
    ],
    important_notes: "Example data — subscribe to see live curated opportunities.",
  },
]);
