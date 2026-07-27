import { Link } from "react-router-dom";
import {
  Users,
  Radar,
  BookOpen,
  ShieldCheck,
  FileSearch,
  Smartphone,
  ArrowRight,
} from "lucide-react";
import { SEO } from "@/components/common/SEO";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";

const pillars = [
  {
    icon: Users,
    title: "The Pan-African SME Directory",
    description:
      "A free, public, searchable record of African founders and their businesses. Create a profile in minutes and become discoverable to buyers, partners, and collaborators across the continent.",
  },
  {
    icon: Radar,
    title: "The Funding Radar",
    description:
      "AI-curated grants, competitions, accelerators, and fellowships — matched to your business and refreshed regularly, so you stop trawling dozens of funder sites to find the calls you actually qualify for.",
  },
  {
    icon: BookOpen,
    title: "Resources & guides",
    description:
      "Practical, no-fluff guidance on building a fundable business — from writing a clear profile to preparing an application — written for founders operating in real African market conditions.",
  },
];

const values = [
  {
    icon: ShieldCheck,
    title: "Trust is the product",
    description:
      "We handle your business identity and paid funding intelligence. Confidence and legitimacy come before flash — always.",
  },
  {
    icon: FileSearch,
    title: "Provenance, not promises",
    description:
      "We are explicit about what is AI-curated versus verified, and about what is sample versus live data. Funding information is guidance, never a guarantee.",
  },
  {
    icon: Smartphone,
    title: "Built mobile-first",
    description:
      "Every screen is designed to work on a mid-range Android phone over a variable network. Performance is a feature, not an afterthought.",
  },
];

const stats = [
  { value: "54", label: "African countries in scope" },
  { value: "Free", label: "To list your business in the directory" },
  { value: "Weekly", label: "Refresh of curated funding opportunities" },
  { value: "1", label: "Profile that opens doors across the continent" },
];

const About = () => {
  return (
    <>
      <SEO
        title="About Us"
        description="Cresciva helps African SME founders get discovered and find real, current funding — combining a free public directory with an AI-curated funding-intelligence feed."
      />

      {/* Hero band */}
      <section className="bg-navy px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <PageHeader
            onDark
            title="We open doors for African founders."
            subtitle="Cresciva combines a free, public SME directory with AI-curated funding intelligence — so your business gets seen and you find the capital calls you actually qualify for."
          />
        </div>
      </section>

      {/* Mission / story */}
      <section className="bg-background px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-2xl font-bold text-ink-strong md:text-3xl">
            Our mission
          </h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              Across Africa, capable founders build real businesses that stay invisible — to
              buyers who would source from them, to partners who would collaborate, and to the
              grants and accelerators actively looking for them. The information exists. It is
              just scattered across dozens of sites, buried in newsletters, and hard to reach on
              the devices founders actually use.
            </p>
            <p>
              Cresciva exists to close that gap. We give every founder a credible place to
              be found, and we do the searching for the funding — so the time you spend goes into
              your business, not into browser tabs.
            </p>
            <p>
              We are deliberately not a "get funding fast" service. Funding information here is
              curated and clearly labelled, meant to help you decide where to apply — never to
              promise an outcome. Earning your trust is the whole point.
            </p>
          </div>
        </div>
      </section>

      {/* Who it serves */}
      <section className="bg-surface-subtle px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-2xl font-bold text-ink-strong md:text-3xl">
            Who we serve
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            African SME founders and young entrepreneurs — often working from a mid-range Android
            phone, over a variable network, and short on time. You are building something real and
            you need two things: to be visible in a credible pan-African directory, and to find
            current funding you qualify for without the endless search. That founder is who every
            decision here is made for.
          </p>
        </div>
      </section>

      {/* What we do */}
      <section className="bg-background px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-ink-strong md:text-3xl">
              What Cresciva does
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              One profile, three ways it works for you.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="h-full rounded-xl border border-border bg-card p-6 shadow-soft"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-white">
                  <pillar.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="font-display text-lg font-bold text-ink-strong">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-surface-subtle px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-ink-strong md:text-3xl">
              What we stand for
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              The principles we hold ourselves to on every screen.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {values.map((value) => (
              <div
                key={value.title}
                className="h-full rounded-xl border border-border bg-card p-6 shadow-soft"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary-dark">
                  <value.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="font-display text-lg font-bold text-ink-strong">
                  {value.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats / impact band */}
      <section className="bg-navy px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-2xl font-display text-2xl font-bold text-white md:text-3xl">
            Built for the whole continent.
          </h2>
          <dl className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/5 p-6">
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block font-display text-3xl font-bold text-primary md:text-4xl">
                    {stat.value}
                  </span>
                  <span className="mt-2 block text-sm leading-relaxed text-white/80">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-8 text-center shadow-soft md:p-12">
          <h2 className="font-display text-2xl font-bold text-ink-strong md:text-3xl">
            Ready to be found?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Create your free directory profile and start putting your business in front of the
            people and funders looking for it.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/directory/create">
                Create your profile
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/resources">Explore the resources</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default About;
