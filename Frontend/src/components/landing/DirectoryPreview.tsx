import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Section, SectionHeading, BrowserFrame, Reveal } from "@shared/components/marketing";
import { DirectoryCard } from "@/components/directory/DirectoryCard";
import { SAMPLE_PROFILES } from "@/content/homepage";

/**
 * The directory shown with the REAL card component and static sample rows.
 *
 * Static rather than live-queried on purpose: the homepage must not depend on
 * a network round-trip or degrade when the query fails. `BrowserFrame` makes
 * the stage inert because the sample slugs don't resolve — the CTA below is
 * the only real link.
 */
const DirectoryPreview = () => (
  <Section tone="light">
    <SectionHeading
      eyebrow="The directory"
      title="A profile that does the finding for you"
      lead="Public, searchable, and free — it puts your business in front of buyers, partners and funders across the continent."
    />

    <Reveal className="mt-14">
      <BrowserFrame label="cresciva.com/directory">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_PROFILES.map((profile) => (
            <DirectoryCard key={profile.id} profile={profile} />
          ))}
        </div>
      </BrowserFrame>
    </Reveal>

    <div className="mt-10 text-center">
      <Button asChild variant="default" size="lg">
        <Link to="/directory">
          Browse the directory
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
      <p className="mt-3 text-sm text-muted-foreground">
        Illustrative listings. Browse the directory for live profiles.
      </p>
    </div>
  </Section>
);

export default DirectoryPreview;
