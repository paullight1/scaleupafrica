import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@shared/components/ui/accordion";
import { SEO } from "@shared/components/common/SEO";
import { faqPageLd } from "@shared/lib/structuredData";
import { PageHeader } from "@shared/components/common/PageHeader";
import { FAQS } from "@/content/faqs";

/** Every question, from the same source the homepage's five are filtered from. */
const FAQPage = () => (
  <>
    <SEO
      title="Frequently Asked Questions"
      description="How the free Pan-African SME Directory, the Funding Radar, membership, payment and renewals work."
      canonical="/faq"
      // Every answer is rendered on this page — FAQ markup describing content
      // that isn't on-page gets ignored, or flagged as spam.
      jsonLd={faqPageLd(FAQS.map((f) => ({ question: f.question, answer: f.answer })))}
    />

    <section className="bg-navy px-6 py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          onDark
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about The Cresciva Collective."
        />
      </div>
    </section>

    <section className="bg-background px-6 py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <Accordion type="single" collapsible className="space-y-4">
          {FAQS.map((faq) => (
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

        <p className="mt-12 text-center text-muted-foreground">
          Still have questions?{" "}
          <a
            href="mailto:hello@cresciva.com"
            className="font-semibold text-navy underline-offset-4 transition-colors hover:text-navy-light hover:underline"
          >
            Reach out to us
          </a>
        </p>
      </div>
    </section>
  </>
);

export default FAQPage;
