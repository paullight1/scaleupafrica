import { describe, expect, it } from "vitest";
import { renderNewsletter } from "./render";
import type { CampaignBlock } from "./types";

function render(blocks: CampaignBlock[]) {
  return renderNewsletter({
    subject: "Funding notes",
    previewText: "Fresh opportunities for African businesses",
    blocks,
  });
}

describe("renderNewsletter", () => {
  it("escapes authored content and removes unsafe links", () => {
    const result = render([
      { id: "p1", type: "paragraph", text: "<script>alert(1)</script>" },
      { id: "b1", type: "button", label: "Apply <now>", url: "javascript:alert(1)" },
    ]);

    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(result.html).not.toContain("javascript:");
    expect(result.text).toContain("<script>alert(1)</script>");
    expect(result.text).not.toContain("javascript:");
  });

  it("renders every supported content block into HTML and useful plain text", () => {
    const result = render([
      { id: "h1", type: "heading", text: "This week", level: 1 },
      { id: "p1", type: "paragraph", text: "Three opportunities worth your time." },
      { id: "i1", type: "image", url: "https://cdn.example.com/grant.jpg", alt: "Founder at work", href: "https://example.com/story" },
      { id: "b1", type: "button", label: "View opportunities", url: "https://cresciva.test/funding" },
      { id: "d1", type: "divider" },
      { id: "f1", type: "funding", title: "Growth grant", summary: "Up to $50,000", url: "https://example.com/grant" },
      { id: "r1", type: "resource", title: "Pitch guide", summary: "A practical checklist", url: "https://cresciva.test/resources/pitch" },
      { id: "s1", type: "social", links: [{ label: "LinkedIn", url: "https://linkedin.com/company/cresciva" }] },
    ]);

    expect(result.html).toContain("This week");
    expect(result.html).toContain("Founder at work");
    expect(result.html).toContain("Growth grant");
    expect(result.html).toContain("Pitch guide");
    expect(result.html).toContain("{{ unsubscribe }}");
    expect(result.text).toContain("View opportunities: https://cresciva.test/funding");
    expect(result.text).toContain("LinkedIn: https://linkedin.com/company/cresciva");
  });

  it("requires HTTPS for images while allowing HTTP links for local previews", () => {
    const result = render([
      { id: "i1", type: "image", url: "http://cdn.example.com/grant.jpg", alt: "Unsafe image" },
      { id: "b1", type: "button", label: "Local preview", url: "http://localhost:8080/funding" },
    ]);

    expect(result.html).not.toContain("cdn.example.com/grant.jpg");
    expect(result.html).toContain("http://localhost:8080/funding");
  });
});
