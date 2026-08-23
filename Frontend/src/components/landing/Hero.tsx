import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Illustration } from "@shared/components/common/Illustration";
import { useViewerState, VIEWER_CTA } from "@/hooks/useViewerState";

/**
 * Split hero: copy left, illustration right. On mobile the illustration drops
 * BELOW the actions so the headline, subhead and both CTAs stay above the fold
 * at 375px — the previous `xl:text-7xl` scale is what pushed them under it.
 */
const Hero = () => {
  const viewer = useViewerState();
  const { primary, secondary } = VIEWER_CTA[viewer];

  return (
    <section className="relative overflow-hidden bg-background">
      {/* Single soft orange glow behind the artwork. No gradient text. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-[36rem] w-[36rem] -translate-y-1/4 translate-x-1/4 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:py-28 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:px-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary-dark">
            Pan-African SME Ecosystem
          </span>

          <h1 className="mt-6 font-display text-4xl font-bold leading-tight text-ink-strong md:text-5xl lg:text-6xl">
            Scale Your Business <span className="text-primary-dark">With Intent.</span>
            <br />
            Access Capital <span className="text-primary-dark">With Clarity.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Get listed on the Pan-African SME Directory and unlock AI-curated funding
            intelligence built for African founders ready to scale.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Button asChild variant="hero" size="xl" className="w-full sm:w-auto">
              <Link to={primary.to!}>
                {primary.label}
                <ArrowRight className="ml-1 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="navyOutline" size="xl" className="w-full sm:w-auto">
              <Link to={secondary.to!}>{secondary.label}</Link>
            </Button>
          </div>

          <p className="mt-7 text-sm text-muted-foreground">
            Directory is free. Funding Intelligence unlocks with a paid membership.
          </p>
        </div>

        <Illustration
          name="hero-growth"
          className="order-last mx-auto h-56 w-full max-w-md sm:h-72 lg:h-auto lg:max-w-none"
        />
      </div>
    </section>
  );
};

export default Hero;
