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
      "The Funding Radar is available exclusively to active Collective members with an annual membership. Once your membership expires, access is revoked until you renew.",
    homepage: false,
  },
  {
    id: "payment",
    question: "How do I pay, and in which currency?",
    answer:
      "Online payments use Bachs hosted checkout. Cresciva prices annual membership in Nigerian Naira (NGN) or US Dollars (USD); Bachs shows the payment methods available for the selected currency and your checkout. If your bank performs a currency conversion, its own rate and charges may apply. If you need help paying, contact our WhatsApp concierge.",
    homepage: true,
  },
  {
    id: "speed",
    question: "How fast is access after I pay?",
    answer:
      "Access is activated automatically after Bachs confirms a successful collection — often within seconds, although some payment methods can take longer to settle. If confirmation is delayed, your billing page remains available and support can trace the checkout using its reference.",
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
      "Cresciva's current annual membership does not auto-renew. Payment details are handled by Bachs, and Cresciva does not receive your card details. Your access runs until its expiry date and you can renew manually; renewing early adds a year to your existing expiry. Any refund rights are governed by our Terms.",
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
