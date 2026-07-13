import { motion } from "framer-motion";
import { Users, Radar, CheckCircle } from "lucide-react";

const pillars = [
  {
    icon: Users,
    title: "The Pan-African SME Directory",
    subtitle: "Free & Public",
    description:
      "A searchable public directory of African founders and their businesses. Create a profile in minutes and become discoverable to buyers, partners, and collaborators across the continent.",
    features: [
      "Free to create a profile",
      "Public and searchable by name, sector, country",
      "Showcase your business, contact and social links",
      "Discover potential suppliers and partners",
    ],
  },
  {
    icon: Radar,
    title: "The Funding Radar",
    subtitle: "Members Only",
    description:
      "An AI-powered page that aggregates relevant grants, competitions and funding calls for African SMEs. Search by keyword and get a fresh curated list built for you.",
    features: [
      "AI-curated funding opportunities",
      "Filter by your business keywords",
      "Grants, competitions, accelerators & more",
      "Access included with annual membership",
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
            What You Get
          </span>
          <h2 className="mb-6 font-serif text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Two Tools. One{" "}
            <span className="text-forest">Growth Engine.</span>
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Get visible on the free Pan-African SME Directory, and unlock AI-curated funding
            intelligence when you're ready to scale.
          </p>
        </motion.div>

        <div className="mt-20 grid gap-8 md:grid-cols-2">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group h-full rounded-3xl border border-border bg-card p-8 shadow-soft transition-all duration-500 hover:border-gold/40 hover:shadow-elevated lg:p-10"
            >
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Solution;
