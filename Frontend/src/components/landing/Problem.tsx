import { Section, SectionHeading, IllustratedCard, Reveal } from "@shared/components/marketing";
import type { IllustrationName } from "@shared/components/common/Illustration";

const problems: { illustration: IllustrationName; title: string; description: string }[] = [
  {
    illustration: "problem-scattered",
    title: "Funding Feels Out of Reach",
    description:
      "Grants, competitions and capital calls exist for African SMEs, but they are scattered across websites, newsletters and WhatsApp groups. You spend hours hunting instead of building.",
  },
  {
    illustration: "problem-time",
    title: "Growth Without a Framework",
    description:
      "You are generating revenue, but scaling feels like guesswork. Without proven growth frameworks tailored to African realities, momentum stalls before it compounds.",
  },
  {
    illustration: "problem-invisible",
    title: "No Shared Growth Infrastructure",
    description:
      "Serious SMEs across the continent are solving the same problems in isolation. There is no shared, trusted place that pairs funding intelligence with growth playbooks built for us.",
  },
];

const Problem = () => (
  <Section id="problem" tone="light">
    <SectionHeading
      eyebrow="The gap"
      title={
        <>
          Ambition Is Not the Problem. <span className="text-primary-dark">Access Is.</span>
        </>
      }
      lead="African SMEs already have the drive. What they need is access to funding and proven growth frameworks that help them scale."
    />

    <div className="mt-16 grid gap-8 md:grid-cols-3">
      {problems.map((problem, index) => (
        <Reveal key={problem.title} delay={index * 80} className="h-full">
          <IllustratedCard illustration={problem.illustration} title={problem.title}>
            {problem.description}
          </IllustratedCard>
        </Reveal>
      ))}
    </div>

    <p className="mx-auto mt-16 max-w-2xl text-center text-lg font-medium text-foreground">
      This is why we built <span className="font-bold text-ink-strong">The Cresciva Collective</span>
      , the funding and growth infrastructure for serious African SMEs.
    </p>
  </Section>
);

export default Problem;
