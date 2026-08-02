import { Section, CTABand } from "@shared/components/marketing";
import NewsletterSignup from "@/components/NewsletterSignup";
import { useViewerState, VIEWER_CTA } from "@/hooks/useViewerState";

/** The page's single dark band — it lands because nothing before it was dark. */
const ClosingCTA = () => {
  const viewer = useViewerState();
  const { primary } = VIEWER_CTA[viewer];

  return (
    <Section tone="dark" className="py-16 md:py-20">
      <CTABand
        illustration="cta-launch"
        title="Get found. Get funded."
        lead="List your business free on the Pan-African SME Directory, and unlock curated funding intelligence when you're ready."
        primary={primary}
        secondary={{ label: "See membership", to: "/#pricing" }}
      >
        <p className="mb-3 text-sm font-semibold text-white">Funding notes, every month</p>
        <NewsletterSignup source="landing-cta" variant="inline" />
      </CTABand>
    </Section>
  );
};

export default ClosingCTA;
