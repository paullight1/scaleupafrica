import { Button } from "@shared/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-hero">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl animate-fade-in flex-col items-center justify-center px-6 py-24 text-center lg:px-8">
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            Pan-African SME Ecosystem
          </span>
        </div>

        <h1 className="mb-6 max-w-4xl font-display text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl xl:text-7xl">
          Scale Your Business{" "}
          <span className="text-primary">With Intent.</span>
          <br />
          Access Capital{" "}
          <span className="text-primary">With Clarity.</span>
        </h1>

        <p className="mb-10 max-w-2xl text-lg leading-relaxed text-white/80 md:text-xl">
          Get listed on the Pan-African SME Directory and unlock AI-curated funding
          intelligence built for African founders ready to scale.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link to="/auth?next=/directory/create">
            <Button variant="hero" size="xl" className="w-full sm:w-auto">
              Get started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/funding">
            <Button variant="onDark" size="xl" className="w-full sm:w-auto">
              Access Funding Intelligence
            </Button>
          </Link>
        </div>

        <p className="mt-8 text-sm text-white/75">
          Directory is free. Funding Intelligence unlocks with annual membership.
        </p>
      </div>
    </section>
  );
};

export default Hero;
