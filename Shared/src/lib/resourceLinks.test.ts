import { describe, expect, it } from "vitest";

import {
  parseResourceLinkMetadata,
  resourceDeliveryKind,
} from "./resourceLinks";

describe("resourceDeliveryKind", () => {
  it("treats Supabase resource-files objects as uploaded files", () => {
    expect(
      resourceDeliveryKind(
        "https://project.supabase.co/storage/v1/object/public/resource-files/file/pitch.pdf",
      ),
    ).toBe("upload");
  });

  it("treats other HTTP destinations as external links", () => {
    expect(resourceDeliveryKind("https://docs.google.com/presentation/d/example/view")).toBe(
      "link",
    );
  });

  it("returns none when no destination is saved", () => {
    expect(resourceDeliveryKind(null)).toBe("none");
  });
});

describe("parseResourceLinkMetadata", () => {
  it("extracts canonical Open Graph fields and resolves relative URLs", () => {
    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Fallback title</title>
          <link rel="canonical" href="/guides/fundraising?ref=preview#top">
          <meta property="og:title" content="A Founder&#39;s Guide">
          <meta property="og:description" content="Practical steps for raising your first round.">
          <meta property="og:image" content="/images/fundraising-cover.jpg">
          <meta property="og:site_name" content="Example Capital">
        </head>
      </html>
    `;

    expect(parseResourceLinkMetadata(html, "https://example.com/articles/first-round")).toEqual({
      url: "https://example.com/guides/fundraising?ref=preview",
      title: "A Founder's Guide",
      description: "Practical steps for raising your first round.",
      imageUrl: "https://example.com/images/fundraising-cover.jpg",
      siteName: "Example Capital",
    });
  });

  it("falls back to document and Twitter metadata when Open Graph fields are absent", () => {
    const html = `
      <html>
        <head>
          <title>Hiring &amp; Culture</title>
          <meta name="description" content="How small teams hire with care.">
          <meta name="twitter:image" content="https://cdn.example.org/hiring.png">
        </head>
      </html>
    `;

    expect(parseResourceLinkMetadata(html, "https://example.org/hiring#people")).toEqual({
      url: "https://example.org/hiring",
      title: "Hiring & Culture",
      description: "How small teams hire with care.",
      imageUrl: "https://cdn.example.org/hiring.png",
      siteName: "example.org",
    });
  });
});
