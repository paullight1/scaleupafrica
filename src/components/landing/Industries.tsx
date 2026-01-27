import { motion } from "framer-motion";
import { Shirt, ShoppingBag, Wheat, UtensilsCrossed, Candy, ArrowRight } from "lucide-react";

const industries = [
  {
    icon: Shirt,
    name: "Fashion & Textiles",
    description: "Designers, manufacturers, and fashion entrepreneurs scaling their brands across Africa and beyond.",
  },
  {
    icon: ShoppingBag,
    name: "Retail & Commerce",
    description: "Physical and digital retailers building sustainable, scalable distribution networks.",
  },
  {
    icon: Wheat,
    name: "Agriculture",
    description: "Farmers, agri-processors, and agritech founders transforming Africa's food systems.",
  },
  {
    icon: UtensilsCrossed,
    name: "Food Processing",
    description: "Food manufacturers and processors adding value to local ingredients for local and export markets.",
  },
  {
    icon: Candy,
    name: "Confectionery",
    description: "Artisanal and commercial confectioners building sweet success stories across the continent.",
  },
];

const Industries = () => {
  return (
    <section className="bg-primary py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="mb-4 inline-block font-semibold uppercase tracking-wider text-gold">
            Who This Is For
          </span>
          <h2 className="mb-6 font-serif text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
            Built for <span className="text-gradient-gold">Serious Founders</span>{" "}
            in Key Sectors
          </h2>
          <p className="text-lg leading-relaxed text-primary-foreground/80">
            We serve SME founders aged 25+ who have moved beyond the startup phase 
            and are ready to structure their growth. If you're in one of these industries, 
            you're in the right place.
          </p>
        </motion.div>

        {/* Industries Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((industry, index) => (
            <motion.div
              key={industry.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-primary-foreground/10 bg-forest-light/20 p-6 backdrop-blur-sm transition-all duration-300 hover:border-gold/40 hover:bg-forest-light/30"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gold/20 text-gold transition-colors group-hover:bg-gold group-hover:text-forest-dark">
                <industry.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-serif text-xl font-semibold text-primary-foreground">
                {industry.name}
              </h3>
              <p className="text-sm leading-relaxed text-primary-foreground/70">
                {industry.description}
              </p>
            </motion.div>
          ))}

          {/* CTA Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="group relative flex flex-col justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gold/40 bg-gold/5 p-6 text-center transition-all duration-300 hover:border-gold hover:bg-gold/10"
          >
            <p className="mb-3 font-serif text-lg font-semibold text-gold">
              Ready to Join?
            </p>
            <p className="mb-4 text-sm text-primary-foreground/70">
              Start scaling with structure today.
            </p>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center text-sm font-semibold text-gold transition-colors hover:text-gold-light"
            >
              View Pricing
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Industries;
