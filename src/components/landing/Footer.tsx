import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import NewsletterSignup from "@/components/NewsletterSignup";

const footerNav: { heading: string; links: { label: string; to: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Directory", to: "/directory" },
      { label: "Funding Radar", to: "/funding" },
      { label: "List your business", to: "/directory/create" },
      { label: "Pricing", to: "/#pricing" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Resource Library", to: "/resources" },
      { label: "Blog", to: "/blog" },
      { label: "Templates", to: "/resources?type=template" },
      { label: "Playbooks", to: "/resources?type=playbook" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
    ],
  },
];

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
              Ready to Scale <span className="text-gradient-gold">With Intent?</span>
            </h2>
            <p className="mb-8 text-lg text-primary-foreground/80">
              Get funding intelligence, founder playbooks and new opportunities in your inbox.
              Join Africa's most focused SME founder collective.
            </p>
            <div className="mx-auto flex max-w-md justify-center">
              <NewsletterSignup source="footer" variant="card" className="mx-auto" />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <p className="font-serif text-xl font-bold text-primary-foreground">
              ScaleUp Africa<span className="text-gold">.</span>
            </p>
            <p className="mt-2 max-w-xs text-sm text-primary-foreground/60">
              The Collective for Pan-African SME founders — visibility, funding intelligence and
              the playbooks to grow.
            </p>
          </div>

          {footerNav.map((col) => (
            <div key={col.heading}>
              <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground/50">
                {col.heading}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-primary-foreground/70 transition-colors hover:text-gold"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/10 pt-8 sm:flex-row">
          <p className="text-sm text-primary-foreground/40">
            © {new Date().getFullYear()} ScaleUp Africa Collective. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-primary-foreground/50">
            <Link to="/privacy" className="transition-colors hover:text-gold">Privacy</Link>
            <Link to="/terms" className="transition-colors hover:text-gold">Terms</Link>
            <Link to="/contact" className="transition-colors hover:text-gold">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
