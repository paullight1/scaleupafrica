import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { Section, SectionHeading, Reveal } from "@shared/components/marketing";
import { Illustration } from "@shared/components/common/Illustration";
import { REASSURANCE_DOES, REASSURANCE_DOESNT } from "@/content/homepage";

/**
 * Replaces the old warning block, and sits AFTER Pricing — it answers doubt at
 * the decision point instead of manufacturing it beforehand.
 *
 * BINDING: the "doesn't" column is neutral. No red, no amber, no
 * alert-triangle, no --destructive token. Both columns carry identical weight
 * and width; neither is subordinate. The disclaimer link is plain text with an
 * arrow, never a button — it offers detail, it does not demand acknowledgement.
 */
const Reassurance = () => (
  <Section tone="light">
    <SectionHeading
      eyebrow="Straight answers"
      title="What Cresciva is — and isn't"
      lead="We would rather you knew exactly what you're buying before you buy it."
    />

    <div className="mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-2">
      <Reveal className="h-full">
        <div className="flex h-full flex-col rounded-xl border border-border bg-card p-8 shadow-soft">
          <Illustration name="reassurance-does" className="mb-6 h-24 self-start" />
          <h3 className="mb-5 font-display text-xl font-semibold text-ink-strong">
            What Cresciva does
          </h3>
          <ul className="space-y-4">
            {REASSURANCE_DOES.map((line) => (
              <li key={line} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary-dark" />
                <span className="text-foreground">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      <Reveal delay={100} className="h-full">
        <div className="flex h-full flex-col rounded-xl border border-border bg-card p-8 shadow-soft">
          <Illustration name="reassurance-doesnt" className="mb-6 h-24 self-start" />
          <h3 className="mb-5 font-display text-xl font-semibold text-ink-strong">
            What it doesn't
          </h3>
          <ul className="space-y-4">
            {REASSURANCE_DOESNT.map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground"
                />
                <span className="text-muted-foreground">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>

    <p className="mt-10 text-center">
      <Link
        to="/disclaimer"
        className="inline-flex items-center gap-1 text-sm font-semibold text-navy underline-offset-4 hover:underline"
      >
        Read the full disclaimer
        <ArrowRight className="h-4 w-4" />
      </Link>
    </p>
  </Section>
);

export default Reassurance;
