import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SEO } from "@/components/common/SEO";

describe("SEO", () => {
  it("sets a suffixed document.title", () => {
    render(<SEO title="Directory" />);
    expect(document.title).toBe("Directory — ScaleUp Africa");
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
});
