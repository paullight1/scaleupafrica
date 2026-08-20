import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SEO } from "@shared/components/common/SEO";
import { SITE_ORIGIN, DEFAULT_OG_IMAGE } from "@shared/lib/siteMeta";

describe("SEO", () => {
  it("sets a suffixed document.title", () => {
    render(<SEO title="Directory" />);
    expect(document.title).toBe("Directory — Cresciva");
  });

  it("upserts the description meta tag", () => {
    render(<SEO title="Funding" description="Find grants for African SMEs." />);
    const meta = document.head.querySelector('meta[name="description"]');
    expect(meta?.getAttribute("content")).toBe("Find grants for African SMEs.");
  });

  it("sets robots noindex when requested", () => {
    render(<SEO title="404" noindex />);
    const robots = document.head.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute("content")).toContain("noindex");
  });

  it("upserts an absolute canonical link and og:url", () => {
    render(<SEO title="Directory" canonical="/directory" />);
    const link = document.head.querySelector('link[rel="canonical"]');
    expect(link?.getAttribute("href")).toBe(`${SITE_ORIGIN}/directory`);
    expect(document.head.querySelector('meta[property="og:url"]')?.getAttribute("content")).toBe(
      `${SITE_ORIGIN}/directory`,
    );
  });

  // Regression: canonical/og:url used to be built from window.location.origin,
  // so a preview deploy (and localhost) declared itself canonical and handed
  // crawlers share URLs that died with the preview.
  it("resolves against SITE_ORIGIN, not the serving origin", () => {
    render(<SEO title="Directory" canonical="/directory" />);
    const href = document.head.querySelector('link[rel="canonical"]')?.getAttribute("href");
    expect(href).not.toContain(window.location.origin);
    expect(href?.startsWith("https://")).toBe(true);
  });

  // Facebook, LinkedIn, Slack and X all reject a relative og:image and render a
  // preview with no picture at all.
  it("emits an absolute og:image and twitter:image by default", () => {
    render(<SEO title="Home" />);
    const og = document.head.querySelector('meta[property="og:image"]')?.getAttribute("content");
    const tw = document.head.querySelector('meta[name="twitter:image"]')?.getAttribute("content");
    expect(og).toBe(`${SITE_ORIGIN}${DEFAULT_OG_IMAGE}`);
    expect(tw).toBe(og);
    expect(document.head.querySelector('meta[property="og:image:width"]')?.getAttribute("content"))
      .toBe("1200");
    expect(document.head.querySelector('meta[property="og:image:height"]')?.getAttribute("content"))
      .toBe("630");
    expect(document.head.querySelector('meta[property="og:image:alt"]')?.getAttribute("content"))
      .toBeTruthy();
  });

  it("makes a page-supplied relative ogImage absolute", () => {
    render(<SEO title="Post" ogImage="/covers/post.png" ogImageAlt="Cover" />);
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute("content")).toBe(
      `${SITE_ORIGIN}/covers/post.png`,
    );
    expect(document.head.querySelector('meta[property="og:image:alt"]')?.getAttribute("content"))
      .toBe("Cover");
  });

  it("passes an already-absolute ogImage through untouched", () => {
    const remote = "https://cdn.example.com/cover.png";
    render(<SEO title="Post" ogImage={remote} />);
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute("content")).toBe(
      remote,
    );
  });

  it("keeps exactly one canonical link across renders", () => {
    render(<SEO title="A" canonical="/a" />);
    render(<SEO title="B" canonical="/b" />);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });

  it("injects JSON-LD blocks and removes them on unmount", () => {
    const ld = { "@context": "https://schema.org", "@type": "Organization", name: "Cresciva" };
    const { unmount } = render(<SEO title="Home" jsonLd={ld} />);

    const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0].textContent ?? "{}")).toMatchObject({ "@type": "Organization" });

    unmount();
    expect(document.head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(0);
  });

  it("injects one script per block when given an array", () => {
    const { unmount } = render(
      <SEO
        title="Post"
        jsonLd={[
          { "@context": "https://schema.org", "@type": "Article", headline: "Hi" },
          { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [] },
        ]}
      />,
    );
    expect(document.head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(2);
    unmount();
  });
});
