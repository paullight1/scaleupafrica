// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Contact from "./Contact";

const submitContact = vi.hoisted(() => vi.fn());

vi.mock("@/lib/email", () => ({ submitContact }));
vi.mock("@shared/lib/analytics", () => ({ trackEvent: vi.fn() }));

describe("Contact inquiry classification", () => {
  beforeEach(() => {
    submitContact.mockReset();
    submitContact.mockResolvedValue({ ok: true, leadId: "lead-1" });
  });

  it("submits the selected support area and optional business sector", async () => {
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Amara Okafor" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "amara@example.com" } });
    fireEvent.change(screen.getByLabelText("Support area"), { target: { value: "funding_support" } });
    fireEvent.change(screen.getByLabelText("Business sector (optional)"), { target: { value: "Technology & Software" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "I need help understanding a funding match." } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(submitContact).toHaveBeenCalledWith({
        name: "Amara Okafor",
        email: "amara@example.com",
        company: undefined,
        supportArea: "funding_support",
        businessSector: "Technology & Software",
        message: "I need help understanding a funding match.",
        hp: "",
      });
    });
  });
});
