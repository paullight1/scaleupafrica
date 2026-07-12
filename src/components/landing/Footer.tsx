import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary">
      <div className="border-b border-primary-foreground/10">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="mb-6 font-serif text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
              Ready to Scale{" "}
              <span className="text-gradient-gold">With Intent?</span>
            </h2>
            <p className="mb-10 text-lg text-primary-foreground/80">
              Join Africa's most focused SME founder collective. Get the capital
              intelligence, community, and Accelerator pathway you need to build
              sustainably.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button variant="hero" size="xl">
                Join the Collective
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <p className="font-serif text-xl font-bold text-primary-foreground">
              ScaleUp Africa<span className="text-gold">.</span>
            </p>
            <p className="mt-1 text-sm text-primary-foreground/60">
              The Collective for Pan-African SME Founders
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-primary-foreground/60">
            <a href="#" className="transition-colors hover:text-gold">Terms of Service</a>
            <a href="#" className="transition-colors hover:text-gold">Privacy Policy</a>
            <a href="#" className="transition-colors hover:text-gold">Contact Us</a>
          </div>

          <p className="text-sm text-primary-foreground/40">
            © {new Date().getFullYear()} ScaleUp Africa Collective
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
