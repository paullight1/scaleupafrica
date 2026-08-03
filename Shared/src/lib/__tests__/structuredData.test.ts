import { describe, it, expect } from "vitest";
import {
  absoluteUrl,
  articleLd,
  breadcrumbLd,
  faqPageLd,
  localBusinessLd,
  organizationLd,
} from "@shared/lib/structuredData";

const ORIGIN = window.location.origin;

describe("structuredData", () => {
  it("makes relative paths absolute and leaves absolute URLs alone", () => {
    expect(absoluteUrl("/directory")).toBe(`${ORIGIN}/directory`);
    expect(absoluteUrl("directory")).toBe(`${ORIGIN}/directory`);
    expect(absoluteUrl("https://example.com/x")).toBe("https://example.com/x");
  });

  it("builds an Organization block", () => {
    const ld = organizationLd({ logo: "/icon-512.png" });
    expect(ld["@type"]).toBe("Organization");
    expect(ld.url).toBe(`${ORIGIN}/`);
    expect(ld.logo).toBe(`${ORIGIN}/icon-512.png`);
  });

  it("omits absent optional fields rather than emitting nulls", () => {
    const ld = localBusinessLd({ name: "Acme", url: "/directory/acme" });
    expect(ld).not.toHaveProperty("image");
    expect(ld).not.toHaveProperty("address");
    expect(ld).not.toHaveProperty("sameAs");
    expect(Object.values(ld)).not.toContain(undefined);
  });

  it("puts the SME's own site in sameAs and the listing in url", () => {
    const ld = localBusinessLd({
      name: "Acme",
      url: "/directory/acme",
      website: "https://acme.co",
      city: "Lagos",
      country: "NG",
    });
    expect(ld.url).toBe(`${ORIGIN}/directory/acme`);
    expect(ld.sameAs).toEqual(["https://acme.co"]);
    expect(ld.address).toMatchObject({ addressLocality: "Lagos", addressCountry: "NG" });
  });

  it("defaults dateModified to datePublished", () => {
    const ld = articleLd({ headline: "Hi", url: "/blog/hi", datePublished: "2026-01-02" });
    expect(ld.dateModified).toBe("2026-01-02");
    expect(ld.publisher).toMatchObject({ name: "Cresciva" });
  });

  it("builds an FAQPage with one Question per item", () => {
    const ld = faqPageLd([{ question: "What?", answer: "This." }]);
    expect(ld.mainEntity).toHaveLength(1);
    expect(ld.mainEntity).toMatchObject([
      { "@type": "Question", name: "What?", acceptedAnswer: { text: "This." } },
    ]);
  });

  it("numbers breadcrumb positions from 1", () => {
    const ld = breadcrumbLd([
      { name: "Home", url: "/" },
      { name: "Blog", url: "/blog" },
    ]);
    expect(ld.itemListElement).toMatchObject([
      { position: 1, item: `${ORIGIN}/` },
      { position: 2, item: `${ORIGIN}/blog` },
    ]);
  });
});
