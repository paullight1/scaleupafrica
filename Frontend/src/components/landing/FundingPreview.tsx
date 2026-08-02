import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Section, SectionHeading, Reveal } from "@shared/components/marketing";
import { Illustration } from "@shared/components/common/Illustration";
import { OpportunityCard } from "@/components/funding/OpportunityCard";
import { SAMPLE_OPPORTUNITY } from "@/content/homepage";

/**
 * One fully legible opportunity, then an honest locked state.
 *
 * Deliberately NOT blurred placeholder cards: a blur implies real content
 * exists behind it at that exact shape and count, which is a claim this page
 * can't support. An explicit locked panel makes the same point without it.
 */
const FundingPreview = () => (
  <Section tone="tinted">
    <SectionHeading
      eyebrow="The Funding Radar"
      title="Live funding calls, curated to you"
      lead="Grants, competitions, accelerators and development finance — filtered to your sector and stage, so you stop hunting across newsletters and group chats."
    />

    <div className="mx-auto mt-14 grid max-w-5xl gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
      <Reveal>
        <OpportunityCard
          opportunity={SAMPLE_OPPORTUNITY}
          open={false}
          onToggle={() => {}}
          sample
        />
      </Reveal>

      <Reveal delay={120}>
        <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <Illustration name="locked-vault" className="mb-6 h-28" />
          <h3 className="font-display text-lg font-semibold text-ink-strong">
            Members see the full curated list
          </h3>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Membership unlocks the whole Funding Radar, refreshed and filtered to your business.
          </p>
          <Button asChild variant="default" className="mt-6">
            <Link to="/#pricing">
              See membership
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Reveal>
    </div>
  </Section>
);

export default FundingPreview;
