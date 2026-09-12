import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "./markdown";

describe("Published Markdown formatting", () => {
  it("keeps paragraphs separate while wrapping ordinary source lines naturally", () => {
    const { container } = render(<Markdown content={'First paragraph\ncontinues here.\n\nSecond paragraph.'} />);
    expect(container.querySelectorAll("p")).toHaveLength(2);
    expect(container.querySelectorAll("br")).toHaveLength(0);
    expect(container.querySelector("p")?.textContent).toBe("First paragraph\ncontinues here.");
  });

  it("preserves deliberate hard line breaks from the editor", () => {
    const { container } = render(<Markdown content={'Line one\\\nLine two  \nLine three'} />);
    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(container.querySelectorAll("br")).toHaveLength(2);
  });

  it("keeps loose numbered items, nested bullets and continuation paragraphs together", () => {
    const { container } = render(<Markdown content={'3. **First item**\n\n   Supporting paragraph.\n\n   - Nested detail\n   - Another detail\n\n4. Second item'} />);
    expect(container.querySelector("ol")?.getAttribute("start")).toBe("3");
    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
    expect(container.querySelectorAll("ol > li:first-child > p")).toHaveLength(2);
    expect(container.querySelectorAll("ol > li:first-child > ul > li")).toHaveLength(2);
  });

  it("renders editor emphasis and headings without leaving Markdown punctuation", () => {
    const { container } = render(<Markdown content={'## Heading\n\n__Bold__ and _italic_, with **bold *nested italic***.'} />);
    expect(screen.getByRole("heading", { name: "Heading", level: 2 })).toBeInTheDocument();
    expect(container.querySelectorAll("strong")).toHaveLength(2);
    expect(container.querySelector("strong em")?.textContent).toBe("nested italic");
  });

  it("preserves link destinations with underscores, parentheses and slide fragments", () => {
    render(<Markdown content={'[Open slides](https://example.com/deck_(final)?view=1#slide_2)'} />);
    expect(screen.getByRole("link", { name: "Open slides" })).toHaveAttribute("href", "https://example.com/deck_(final)?view=1#slide_2");
  });

  it("keeps table columns aligned and contained in their own scroll region", () => {
    render(<Markdown content={'| Item | Amount |\n| :--- | ---: |\n| Plan | 10000 |'} />);
    expect(screen.getByRole("region", { name: "Content table" })).toContainElement(screen.getByRole("table"));
    expect(screen.getByRole("columnheader", { name: "Amount" })).toHaveAttribute("style", "text-align: right;");
  });

  it("does not turn pasted HTML or unsafe URLs into executable content", () => {
    const { container } = render(<Markdown content={'<img src=x onerror=alert(1)>\n\n[Unsafe](javascript:alert%281%29)'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Unsafe")).not.toHaveAttribute("href", expect.stringContaining("javascript:"));
  });
});
