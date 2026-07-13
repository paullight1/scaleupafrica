import { motion } from "framer-motion";
import { AlertTriangle, Info } from "lucide-react";

const disclaimerPoints = [
  {
    title: "We Are Not a Funding Organization",
    description:
      "The ScaleUp Africa Collective is an educational and networking membership. We do not provide grants, loans, or direct funding of any kind.",
  },
  {
    title: "No Guarantee of Grant Success",
    description:
      "While we provide curated information about funding opportunities, we cannot and do not guarantee that any member will receive a grant or funding. Success depends on many factors beyond our control.",
  },
  {
    title: "We Do Not Write Applications",
    description:
      "Our team does not write, edit, or submit grant applications on behalf of members. We provide information and guidance, but the application process remains your responsibility.",
  },
  {
    title: "Directory Listings Are Member-Provided",
    description:
      "SME Directory profiles are created and maintained by members themselves. We do not verify, endorse, or guarantee the accuracy of any business listed. Do your own due diligence before transacting.",
  },
  {
    title: "Information Accuracy",
    description:
      "We strive to provide accurate and timely information about funding opportunities. However, details change frequently, and members should always verify information directly with funding sources.",
  },
];

const Disclaimer = () => {
  return (
    <section className="bg-card py-24">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-forest/10 text-forest">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mb-4 font-serif text-2xl font-bold text-foreground md:text-3xl">
            Important Disclaimer
          </h2>
          <p className="text-muted-foreground">
            Please read and understand these important points before joining.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-2xl border border-border bg-secondary/50 p-8"
        >
          <div className="space-y-6">
            {disclaimerPoints.map((point, index) => (
              <div
                key={point.title}
                className="flex gap-4 border-b border-border/50 pb-6 last:border-0 last:pb-0"
              >
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-forest/10 text-sm font-semibold text-forest">
                    {index + 1}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-foreground">{point.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {point.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-xl bg-gold/10 p-4">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-gold-dark" />
            <p className="text-sm text-foreground">
              <strong>In Summary:</strong> We are your supportive partner in the scaling
              journey, providing visibility through the directory and curated capital
              intelligence. The work of building and funding your business remains yours.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Disclaimer;
