import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Can I pay in my local currency?",
    answer:
      "Our payment processor accepts major international payment methods including Visa, Mastercard, and mobile money options in select African countries. The price is displayed in USD, but your card/payment provider will convert it to your local currency at the current exchange rate. We're actively working to add more local payment options.",
  },
  {
    question: "How often are the coaching sessions held?",
    answer:
      "We host Monthly Mastery Coaching sessions—typically one deep-dive session per month on rotation between our three core themes: Funding Strategy, Scaling Operations, and Digital Transformation. All sessions are held virtually and recorded for members who can't attend live. You'll also have access to our complete library of past sessions.",
  },
  {
    question: "What types of grants and funding opportunities are shared?",
    answer:
      "We focus on opportunities relevant to SMEs in our core sectors: Fashion, Retail, Agriculture, Food Processing, and Confectionery. This includes grants, competitions, pitch events, accelerator programs, and development finance opportunities from both African and international organizations. We filter for opportunities that are actually accessible to African SMEs—no misleading or irrelevant listings.",
  },
  {
    question: "How do the Peer Circles work?",
    answer:
      "Peer Circles are sector-specific groups of 8-15 founders who meet bi-weekly for structured peer learning sessions. You'll be matched with others in your industry (e.g., Fashion founders, Agri founders) for relevant discussions. Sessions are facilitated to ensure productive conversations around shared challenges, wins, and opportunities.",
  },
  {
    question: "What's the difference between Monthly and Annual membership?",
    answer:
      "Both plans give you identical access to all features—Funding Radar, Peer Circles, and Monthly Mastery Coaching. The only difference is pricing: Annual members pay $200/year (equivalent to $16.67/month), saving 2 months compared to paying monthly. Annual is best if you're committed to your growth journey for the year ahead.",
  },
  {
    question: "Can I cancel my membership anytime?",
    answer:
      "Yes. Monthly members can cancel anytime, and your access continues until the end of your current billing period. Annual members can also cancel, but refunds are not provided for the remaining months—your access simply continues until your year ends. We don't believe in trapping members, so cancellation is straightforward.",
  },
  {
    question: "I'm just starting my business. Is this for me?",
    answer:
      "The Collective is designed for founders who have moved beyond the pure ideation stage—you have a product or service, some revenue (even if small), and are ready to think about structured growth. If you're still figuring out your business model, you might benefit more from other resources first. That said, if you're in our sectors and serious about building, you're welcome to join and learn.",
  },
  {
    question: "How is this different from other founder communities?",
    answer:
      "Three things set us apart: (1) Sector Focus—we specialize in Fashion, Retail, Agri-food, and Confectionery, not generic 'startups'; (2) Pan-African Network—we bring together founders from across the continent, not just one city or country; and (3) Curated Capital Intelligence—our Funding Radar is specifically filtered for SMEs in our sectors, not a generic opportunity feed.",
  },
];

const FAQ = () => {
  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block font-semibold uppercase tracking-wider text-gold">
            Questions & Answers
          </span>
          <h2 className="mb-4 font-serif text-3xl font-bold text-foreground md:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know about The ScaleUp Africa Collective.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
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

        {/* Contact CTA */}
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
