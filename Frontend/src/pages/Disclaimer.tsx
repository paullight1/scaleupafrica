import { Link } from "react-router-dom";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { DISCLAIMER_POINTS, DISCLAIMER_SUMMARY } from "@/content/homepage";

/**
 * The full disclosure, on a permanent, citable URL.
 *
 * This content used to be a warning block wedged in front of the homepage
 * pricing section. Moving it here makes it MORE reachable, not less: it is
 * linked from the footer, the pricing fine print, and the homepage
 * reassurance section. Nothing has been softened or shortened.
 */
const Disclaimer = () => (
  <>
    <SEO
      title="Disclaimer"
      description="What Cresciva does and does not do: we are not a funding organisation, we do not write applications, and we do not guarantee funding outcomes."
    />

    <section className="bg-navy px-6 py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          onDark
          title="Disclaimer"
          subtitle="Please read and understand these points before joining The Cresciva Collective."
        />
      </div>
    </section>

    <section className="bg-background px-6 py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <ol className="space-y-8">
          {DISCLAIMER_POINTS.map((point, index) => (
            <li key={point.title} className="flex gap-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold text-navy">
                {index + 1}
              </span>
              <div>
                <h2 className="mb-2 font-display text-lg font-semibold text-ink-strong">
                  {point.title}
                </h2>
                <p className="leading-relaxed text-muted-foreground">{point.description}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 rounded-xl border border-border bg-surface-subtle p-6">
          <h2 className="mb-2 font-display text-lg font-semibold text-ink-strong">In summary</h2>
          <p className="leading-relaxed text-muted-foreground">{DISCLAIMER_SUMMARY}</p>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          Questions about any of this?{" "}
          <Link to="/contact" className="font-semibold text-navy underline-offset-4 hover:underline">
            Get in touch
          </Link>
          .
        </p>
      </div>
    </section>
  </>
);

export default Disclaimer;
