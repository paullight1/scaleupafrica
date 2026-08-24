// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { readConsent } from "@shared/lib/consent";
import { CookieConsent } from "./CookieConsent";

function renderConsent() {
  return render(
    <MemoryRouter>
      <CookieConsent />
    </MemoryRouter>,
  );
}

describe("CookieConsent", () => {
  beforeEach(() => localStorage.clear());

  it("shows the bottom consent bar until optional storage is rejected", () => {
    renderConsent();

    expect(screen.getByRole("region", { name: "Cookie consent" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reject optional" }));

    expect(screen.queryByRole("region", { name: "Cookie consent" })).not.toBeInTheDocument();
    expect(readConsent()).toEqual({ analytics: false });
  });

  it("allows analytics to be enabled from cookie settings", () => {
    renderConsent();

    fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    expect(screen.getByRole("dialog", { name: "Cookie settings" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Analytics" }));
    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));

    expect(readConsent()).toEqual({ analytics: true });
  });
});
