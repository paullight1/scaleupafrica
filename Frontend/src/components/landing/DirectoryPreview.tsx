import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Section, SectionHeading, BrowserFrame, Reveal } from "@shared/components/marketing";
import { DirectoryCard } from "@/components/directory/DirectoryCard";
import { useDirectorySearch } from "@/hooks/queries/directory";
import { CardSkeleton } from "@shared/components/common/LoadingState";

/**
 * The homepage preview uses the same live directory query and card component
 * as the full directory page, so visitors see current published listings.
 */
const DirectoryPreview = () => {
  const { data, isLoading } = useDirectorySearch({ q: "", country: null, sector: null });
  const profiles = data?.pages[0]?.rows.slice(0, 3) ?? [];

  return <Section tone="light">
    <SectionHeading
      eyebrow="The directory"
      title="A profile that does the finding for you"
      lead="Public, searchable, and free — it puts your business in front of buyers, partners and funders across the continent."
    />

    <Reveal className="mt-14">
      <BrowserFrame label="cresciva.com/directory">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => <CardSkeleton key={index} lines={3} />)}
          </div>
        ) : profiles.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => <DirectoryCard key={profile.id} profile={profile} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
            Directory listings will appear here as founders publish their profiles.
          </div>
        )}
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
        Browse the directory for more live profiles.
      </p>
    </div>
  </Section>
};

export default DirectoryPreview;
