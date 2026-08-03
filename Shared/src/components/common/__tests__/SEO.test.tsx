import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SEO } from "@shared/components/common/SEO";

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
    expect(link?.getAttribute("href")).toBe(`${window.location.origin}/directory`);
    expect(document.head.querySelector('meta[property="og:url"]')?.getAttribute("content")).toBe(
      `${window.location.origin}/directory`,
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
