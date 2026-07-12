import { motion } from "framer-motion";
import { AlertCircle, Search, Users } from "lucide-react";

const problems = [
  {
    icon: AlertCircle,
    title: "Great Ideas, No Structure",
    description:
      "You have the vision and the drive, but scaling feels like building a plane while flying it. Without proper frameworks, growth becomes chaos.",
  },
  {
    icon: Search,
    title: "Fragmented Funding Information",
    description:
      "Grant opportunities exist, but they are scattered across websites, WhatsApp groups, and word of mouth. You spend hours searching instead of building.",
  },
  {
    icon: Users,
    title: "The Loneliness of Leadership",
    description:
      "Being a founder can be isolating. Few understand your challenges, and finding peers who truly get the African SME journey is rare.",
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
            The African Paradox
          </span>
          <h2 className="mb-6 font-serif text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Talent Is Abundant.{" "}
            <span className="text-forest">Structure Is Scarce.</span>
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Across Africa, brilliant founders are building incredible businesses.
            But too many are held back not by lack of ambition, but by lack of access.
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
          , a bridge between hustle and scale.
        </motion.p>
      </div>
    </section>
  );
};

export default Problem;
