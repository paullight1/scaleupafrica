import { motion } from "framer-motion";
import { Radar, Users2, Rocket, CheckCircle } from "lucide-react";

const pillars = [
  {
    icon: Radar,
    title: "The Funding Radar",
    subtitle: "Capital Intelligence",
    description:
      "Stop hunting for opportunities. Our team curates and delivers relevant grants, competitions, and funding calls directly to your inbox, filtered for African SMEs.",
    features: [
      "Monthly curated funding digest",
      "Opportunities across sectors",
      "Early alerts on upcoming deadlines",
      "Grant eligibility breakdowns",
    ],
  },
  {
    icon: Users2,
    title: "The WhatsApp Community",
    subtitle: "Pan-African SME Directory",
    description:
      "A low-lift, high-signal WhatsApp group that functions as a Pan-African SME directory. Ask questions, share challenges, find suppliers, and build partnerships for cross-border trade.",
    features: [
      "Pan-African SME directory",
      "Ask questions and share challenges",
      "Find suppliers and trusted vendors",
      "Cross-border trade partnerships",
      "Opportunities posted directly in-group",
    ],
  },
  {
    icon: Rocket,
    title: "The Accelerator Program",
    subtitle: "Selective Deep Support",
    description:
      "A selective program for revenue-generating SMEs based in Africa at the scale stage. Membership in the Collective is the first step toward eligibility. It does not guarantee a place.",
    features: [
      "Application-based selection",
      "Cohort-based deep support",
      "Available to Collective members only",
      "For revenue-generating African SMEs",
    ],
  },
];

const Solution = () => {
  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="mb-4 inline-block font-semibold uppercase tracking-wider text-gold">
            The Three Pillars
          </span>
          <h2 className="mb-6 font-serif text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Your Complete{" "}
            <span className="text-forest">Scaling Ecosystem</span>
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            We have built the infrastructure you need to move from surviving to thriving.
            Capital, Community, and a pathway into our Accelerator.
          </p>
        </motion.div>

        <div className="mt-20 space-y-12 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="relative"
            >
              <div className="group h-full rounded-3xl border border-border bg-card p-8 shadow-soft transition-all duration-500 hover:border-gold/40 hover:shadow-elevated lg:p-10">
                <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-forest to-forest-light text-primary-foreground shadow-medium">
                  <pillar.icon className="h-8 w-8" />
                </div>

                <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold">
                  {pillar.subtitle}
                </p>
                <h3 className="mb-4 font-serif text-2xl font-bold text-foreground">
                  {pillar.title}
                </h3>
                <p className="mb-8 leading-relaxed text-muted-foreground">
                  {pillar.description}
                </p>

                <ul className="space-y-3">
                  {pillar.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-gold" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Solution;
