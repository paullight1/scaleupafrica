import { Check } from "lucide-react";
import { Section, SectionHeading, SplitRow, Reveal } from "@shared/components/marketing";
import type { IllustrationName } from "@shared/components/common/Illustration";

/**
 * Replaces Solution.tsx. The two-pillar framing ("here are two products")
 * becomes a sequence ("here is what happens") — the directory bullets fold
 * into steps 1 and 2, the funding bullets into step 3. No content is lost.
 */
const steps: {
  illustration: IllustrationName;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
}[] = [
  {
    illustration: "step-list",
    eyebrow: "Step one",
    title: "List your business",
    description:
      "Create a public profile in minutes — what you do, where you operate, and how to reach you. Free, forever.",
    points: ["Free to create a profile", "Showcase your business, contact and social links"],
  },
  {
    illustration: "step-discovered",
    eyebrow: "Step two",
    title: "Get discovered",
    description:
      "Your profile is public and searchable, so buyers, partners and collaborators across the continent can find you by name, sector or country.",
    points: [
      "Public and searchable by name, sector, country",
      "Discover potential suppliers and partners",
    ],
  },
  {
    illustration: "step-funding",
    eyebrow: "Step three",
    title: "Unlock funding intelligence",
    description:
      "Members get the Funding Radar: grants, competitions, accelerators and development finance calls, curated to your sector and stage.",
    points: [
      "AI-curated funding opportunities",
      "Grants, competitions, accelerators & more",
      "Access included with annual membership",
    ],
  },
];

const HowItWorks = () => (
  <Section id="solution" tone="tinted">
    <SectionHeading
      eyebrow="How it works"
      title="Two Tools. One Growth Engine."
      lead="Get visible on the free Pan-African SME Directory, and unlock AI-curated funding intelligence when you're ready to scale."
    />

    <div className="mt-16 space-y-16 md:space-y-24">
      {steps.map((step, index) => (
        <Reveal key={step.title}>
          <SplitRow illustration={step.illustration} reverse={index % 2 === 1}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-navy">
              {step.eyebrow}
            </p>
            <h3 className="mb-4 font-display text-2xl font-bold text-ink-strong md:text-3xl">
              {step.title}
            </h3>
            <p className="mb-6 leading-relaxed text-muted-foreground">{step.description}</p>
            <ul className="space-y-3">
              {step.points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary-dark" />
                  <span className="text-sm text-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </SplitRow>
        </Reveal>
      ))}
    </div>
  </Section>
);

export default HowItWorks;
