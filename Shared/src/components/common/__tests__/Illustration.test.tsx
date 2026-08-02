import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Illustration } from "@shared/components/common/Illustration";

describe("Illustration", () => {
  it("is decorative without a title", () => {
    const { container } = render(<Illustration name="empty-search" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("is an accessible image with a title", () => {
    render(<Illustration name="empty-search" title="Nothing found" />);
    expect(screen.getByRole("img", { name: "Nothing found" })).toBeInTheDocument();
  });

  it("follows the theme by default", () => {
    const { container } = render(<Illustration name="empty-search" />);
    expect(container.firstElementChild).toHaveClass("text-navy");
  });

  it("forces white strokes on a dark marketing surface", () => {
    const { container } = render(<Illustration name="empty-search" tone="dark" />);
    expect(container.firstElementChild).toHaveClass("text-white");
    expect(container.firstElementChild).not.toHaveClass("text-navy");
  });
});
