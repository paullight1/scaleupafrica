import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@shared/components/ui/accordion";
import { Section, SectionHeading } from "@shared/components/marketing";
import { HOMEPAGE_FAQS } from "@/content/faqs";

/**
 * The five questions that block a purchase decision. The other four are
 * positioning, not blockers — they live on /faq, from the same source file.
 * No answer was deleted; the page just stopped being a wall.
 */
const FAQ = () => (
  <Section id="faq" tone="tinted" containerClassName="max-w-4xl">
    <SectionHeading
      eyebrow="Questions"
      title="Frequently Asked Questions"
      lead="Everything you need to know before joining The Cresciva Collective."
    />

    <Accordion type="single" collapsible className="mt-14 space-y-4">
      {HOMEPAGE_FAQS.map((faq) => (
        <AccordionItem
          key={faq.id}
          value={faq.id}
          className="rounded-xl border border-border bg-card px-6 shadow-soft data-[state=open]:border-primary/40 data-[state=open]:shadow-medium"
        >
          <AccordionTrigger className="py-5 text-left font-semibold text-foreground hover:text-navy hover:no-underline [&[data-state=open]]:text-navy">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="pb-5 leading-relaxed text-muted-foreground">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>

    <div className="mt-10 text-center">
      <Link
        to="/faq"
        className="inline-flex items-center gap-1 text-sm font-semibold text-navy underline-offset-4 hover:underline"
      >
        See all questions
        <ArrowRight className="h-4 w-4" />
      </Link>
      <p className="mt-4 text-muted-foreground">
        Still have questions?{" "}
        <a
          href="mailto:hello@cresciva.com"
          className="font-semibold text-navy underline-offset-4 transition-colors hover:text-navy-light hover:underline"
        >
          Reach out to us
        </a>
      </p>
    </div>
  </Section>
);

export default FAQ;
