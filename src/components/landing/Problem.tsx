import { motion } from "framer-motion";
import { Search, TrendingUp, Compass } from "lucide-react";

const problems = [
  {
    icon: Search,
    title: "Funding Feels Out of Reach",
    description:
      "Grants, competitions and capital calls exist for African SMEs, but they are scattered across websites, newsletters and WhatsApp groups. You spend hours hunting instead of building.",
  },
  {
    icon: Compass,
    title: "Growth Without a Framework",
    description:
      "You are generating revenue, but scaling feels like guesswork. Without proven growth frameworks tailored to African realities, momentum stalls before it compounds.",
  },
  {
    icon: TrendingUp,
    title: "No Shared Growth Infrastructure",
    description:
      "Serious SMEs across the continent are solving the same problems in isolation. There is no shared, trusted place that pairs funding intelligence with growth playbooks built for us.",
  },
];

const Problem = () => {
  return (
    <section className="bg-secondary py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="mb-4 inline-block font-semibold uppercase tracking-wider text-gold-dark">
            The African SME Reality
          </span>
          <h2 className="mb-6 font-serif text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Ambition Is Not the Problem.{" "}
            <span className="text-forest">Access Is.</span>
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            African SMEs already have the drive. What they need is access to funding
            and proven growth frameworks that actually move the needle.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group relative rounded-2xl border border-border bg-card p-8 shadow-soft transition-all duration-300 hover:border-gold/30 hover:shadow-medium"
            >
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-forest/10 text-forest transition-colors group-hover:bg-gold/10 group-hover:text-gold-dark">
                <problem.icon className="h-7 w-7" />
              </div>
              <h3 className="mb-3 font-serif text-xl font-semibold text-foreground">
                {problem.title}
              </h3>
              <p className="leading-relaxed text-muted-foreground">
                {problem.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mx-auto mt-16 max-w-2xl text-center text-lg font-medium text-foreground"
        >
          This is why we built{" "}
          <span className="text-gradient-gold font-bold">
            The ScaleUp Africa Collective
          </span>
          , the funding and growth infrastructure for serious African SMEs.
        </motion.p>
      </div>
    </section>
  );
};

export default Problem;
