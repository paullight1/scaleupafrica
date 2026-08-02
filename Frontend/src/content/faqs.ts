/**
 * The single source for every FAQ. `homepage: true` marks the five that block
 * a purchase decision — those five render on `/`, all nine render on `/faq`.
 * Trimming the homepage must never delete an answer.
 */
export type Faq = {
  id: string;
  question: string;
  answer: string;
  homepage: boolean;
};

export const FAQS: Faq[] = [
  {
    id: "who-for",
    question: "Which SMEs is the Collective for?",
    answer:
      "The Collective is sector-agnostic. We welcome African SME founders across all industries who are ready to scale their businesses with structure and access to curated capital intelligence.",
    homepage: false,
  },
  {
    id: "directory-free",
    question: "Is the SME Directory free?",
    answer:
      "Yes. The Pan-African SME Directory is free to join and public. Create a profile in minutes and become discoverable to buyers, partners, and collaborators across the continent.",
    homepage: true,
  },
  {
    id: "what-is-radar",
    question: "What is the Funding Radar?",
    answer:
      "The Funding Radar is our AI-powered page that aggregates relevant grants, competitions, accelerators, pitch events, and development finance opportunities for African SMEs. Enter keywords describing your business and get a curated list.",
    homepage: true,
  },
  {
    id: "access-radar",
    question: "How do I access the Funding Radar?",
    answer:
      "The Funding Radar is available exclusively to active Collective members with an annual subscription. Once your subscription expires, access is revoked until you resubscribe.",
    homepage: false,
  },
  {
    id: "payment",
    question: "How do I pay, and in which currency?",
    answer:
      "Card payments are processed securely by Paystack in Nigerian Naira (NGN) or US Dollars (USD). If you pay a USD price with a local card, your bank converts at its own rate. Prefer mobile money or a bank transfer? Message us on WhatsApp — we confirm your payment and activate your membership within 12 hours.",
    homepage: true,
  },
  {
    id: "speed",
    question: "How fast is access after I pay?",
    answer:
      "Card payments are automatic — access is usually unlocked in under a minute once the payment is confirmed. Bank transfers and mobile-money payments handled by our concierge are activated within 12 hours.",
    homepage: true,
  },
  {
    id: "monthly",
    question: "Is there a monthly plan?",
    answer:
      "We offer an annual membership only. This keeps the community focused, committed, and easier to serve deeply throughout the year.",
    homepage: false,
  },
  {
    id: "renewal",
    question: "Does my membership auto-renew? Can I cancel?",
    answer:
      "No auto-renew — we never store your card or charge you again, so there's nothing to cancel. Your access runs until it expires; renew any time (renewing early adds a year to your current expiry). We don't provide partial refunds.",
    homepage: true,
  },
  {
    id: "differentiation",
    question: "How is this different from other founder communities?",
    answer:
      "Two things set us apart: a free public directory that gives every African founder visibility, and AI-curated capital intelligence filtered specifically for African SMEs ready to scale.",
    homepage: false,
  },
];

export const HOMEPAGE_FAQS: Faq[] = FAQS.filter((faq) => faq.homepage);
