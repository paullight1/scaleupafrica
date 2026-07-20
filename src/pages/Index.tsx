import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_AUTHED_ROUTE } from "@/lib/routes";
import { SEO } from "@/components/common/SEO";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import Solution from "@/components/landing/Solution";
import Pricing from "@/components/landing/Pricing";
import Disclaimer from "@/components/landing/Disclaimer";
import FAQ from "@/components/landing/FAQ";

const Index = () => {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();

  // Returning members land on their dashboard, not the marketing page.
  // Escape hatch: /?home=1 keeps them on the landing page.
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
      <section id="problem">
        <Problem />
      </section>
      <section id="solution">
        <Solution />
      </section>
      <Disclaimer />
      <Pricing />
      <section id="faq">
        <FAQ />
      </section>
    </div>
  );
};

export default Index;
