import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-entrepreneurs.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-primary">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="African entrepreneurs in their workspaces"
          className="h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/70 to-primary" />
        <div className="absolute inset-0 bg-hero-pattern" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 py-24 text-center lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-sm font-medium text-gold">
            <Sparkles className="h-4 w-4" />
            Pan-African SME Ecosystem
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mb-6 max-w-4xl font-serif text-4xl font-bold leading-tight text-primary-foreground md:text-5xl lg:text-6xl xl:text-7xl"
        >
          Scale Your Business{" "}
          <span className="text-gradient-gold">With Intent.</span>
          <br />
          Access Capital{" "}
          <span className="text-gradient-gold">With Clarity.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mb-10 max-w-2xl text-lg leading-relaxed text-primary-foreground/80 md:text-xl"
        >
          Get listed on the Pan-African SME Directory and unlock AI-curated funding
          intelligence built for African founders ready to scale.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col gap-4 sm:flex-row"
        >
          <Link to="/auth?next=/directory/create">
            <Button variant="hero" size="xl" className="w-full sm:w-auto">
              Get started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/funding">
            <Button variant="heroOutline" size="xl" className="w-full sm:w-auto">
              Access Funding Intelligence
            </Button>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-8 text-sm text-primary-foreground/60"
        >
          Directory is free. Funding Intelligence unlocks with annual membership.
        </motion.p>
      </div>
    </section>
  );
};

export default Hero;
