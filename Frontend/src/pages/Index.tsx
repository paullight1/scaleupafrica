import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@shared/hooks/useAuth";
import { DEFAULT_AUTHED_ROUTE } from "@shared/lib/routes";
import { SEO } from "@shared/components/common/SEO";
import Hero from "@/components/landing/Hero";
import ViewerBand from "@/components/landing/ViewerBand";
import Problem from "@/components/landing/Problem";
import HowItWorks from "@/components/landing/HowItWorks";
import DirectoryPreview from "@/components/landing/DirectoryPreview";
import FundingPreview from "@/components/landing/FundingPreview";
import Pricing from "@/components/landing/Pricing";
import Reassurance from "@/components/landing/Reassurance";
import Insights from "@/components/landing/Insights";
import FAQ from "@/components/landing/FAQ";
import ClosingCTA from "@/components/landing/ClosingCTA";

/**
 * The twelve-section landing page.
 *
 * Tone alternates light / tinted down the page, with exactly one dark band at
 * the end — it lands precisely because nothing before it was dark.
 *
 * Reassurance sits AFTER Pricing on purpose: it answers doubt at the decision
 * point rather than manufacturing it beforehand.
 */
const Index = () => {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();

  // Returning members land on their dashboard, not the marketing page.
  // Escape hatch: /?home=1 keeps them here — and the sections adapt to them.
  if (!loading && user && params.get("home") !== "1") {
    return <Navigate to={DEFAULT_AUTHED_ROUTE} replace />;
  }

  return (
    <div className="overflow-x-hidden">
      <SEO
        title="Pan-African SME Directory & Funding Intelligence"
        description="List your business on the Pan-African SME directory and find real, current funding opportunities — grants, accelerators, and fellowships curated for African founders."
      />
      <Hero />
      <ViewerBand />
      <Problem />
      <HowItWorks />
      <DirectoryPreview />
      <FundingPreview />
      <Pricing />
      <Reassurance />
      <Insights />
      <FAQ />
      <ClosingCTA />
    </div>
  );
};

export default Index;
