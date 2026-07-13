import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Which SMEs is the Collective for?",
    answer:
      "The Collective is sector-agnostic. We welcome African SME founders across all industries who are ready to scale their businesses with structure and access to curated capital intelligence.",
  },
  {
    question: "Is the SME Directory free?",
    answer:
      "Yes. The Pan-African SME Directory is free to join and public. Create a profile in minutes and become discoverable to buyers, partners, and collaborators across the continent.",
  },
  {
    question: "What is the Funding Radar?",
    answer:
      "The Funding Radar is our AI-powered page that aggregates relevant grants, competitions, accelerators, pitch events, and development finance opportunities for African SMEs. Enter keywords describing your business and get a curated list.",
  },
  {
    question: "How do I access the Funding Radar?",
    answer:
      "The Funding Radar is available exclusively to active Collective members with an annual subscription. Once your subscription expires, access is revoked until you resubscribe.",
  },
  {
    question: "Can I pay in my local currency?",
    answer:
      "Yes. Pricing is displayed in your selected country's currency, and our payment processor supports major cards and mobile money options across several African markets. If your local currency is not shown, your bank will convert at the prevailing rate.",
  },
  {
    question: "Is there a monthly plan?",
    answer:
      "We offer an annual membership only. This keeps the community focused, committed, and easier to serve deeply throughout the year.",
  },
  {
    question: "Can I cancel my membership?",
    answer:
      "Yes. You can cancel at any time. Your access continues until the end of your current annual term, and refunds for remaining months are not provided.",
  },
  {
    question: "How is this different from other founder communities?",
    answer:
      "Two things set us apart: a free public directory that gives every African founder visibility, and AI-curated capital intelligence filtered specifically for African SMEs ready to scale.",
  },
];

const FAQ = () => {
  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block font-semibold uppercase tracking-wider text-gold">
            Questions and Answers
          </span>
          <h2 className="mb-4 font-serif text-3xl font-bold text-foreground md:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know about The ScaleUp Africa Collective.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="rounded-xl border border-border bg-card px-6 shadow-soft data-[state=open]:border-gold/30 data-[state=open]:shadow-medium"
              >
                <AccordionTrigger className="py-5 text-left font-semibold text-foreground hover:text-forest hover:no-underline [&[data-state=open]]:text-forest">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 leading-relaxed text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground">
            Still have questions?{" "}
            <a
              href="mailto:hello@scaleupafricacollective.com"
              className="font-semibold text-forest underline-offset-4 transition-colors hover:text-gold hover:underline"
            >
              Reach out to us
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
