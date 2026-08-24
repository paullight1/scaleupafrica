import { describe, it, expect } from "vitest";
import {
  contactAck,
  contactNotify,
  formatAmount,
  fundingAlert,
  newsletterWelcome,
  paymentReceipt,
  render,
  resourceDelivery,
} from "../../../../supabase/functions/_shared/email/templates";
import { esc, safeUrl } from "../../../../supabase/functions/_shared/email/render";

const SITE = "https://cresciva.com";

describe("render primitives", () => {
  it("escapes every HTML-significant character", () => {
    expect(esc(`<script>alert("x")&'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;",
    );
  });

  it("safeUrl passes http/https and rejects everything else", () => {
    expect(safeUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeUrl("http://example.com")).toBe("http://example.com/");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(safeUrl("/relative/path")).toBeNull();
    expect(safeUrl(null)).toBeNull();
  });
});

describe("contactAck", () => {
  it("renders subject, HTML and a plain-text alternative", () => {
    const mail = contactAck({ siteUrl: SITE, name: "Amara Okafor", message: "Hello there team" });
    expect(mail.subject).toContain("We got your message");
    expect(mail.html).toContain("<!doctype html>");
    expect(mail.text).toContain("Hi Amara,");
    expect(mail.text).toContain("Hello there team");
  });

  it("greets neutrally when no name was supplied", () => {
    const mail = contactAck({ siteUrl: SITE, name: null, message: "no name here" });
    expect(mail.text).toContain("Hi there,");
  });

  it("never emits an unescaped script tag from the message body", () => {
    const mail = contactAck({
      siteUrl: SITE,
      name: `<img src=x onerror=alert(1)>`,
      message: `<script>alert("pwned")</script>`,
    });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("onerror=");
    expect(mail.html).toContain("&lt;script&gt;");
  });

  it("preserves paragraph breaks in the quoted message", () => {
    const mail = contactAck({ siteUrl: SITE, name: "Sam", message: "First para\n\nSecond para" });
    expect(mail.html).toContain("First para");
    expect(mail.html).toContain("Second para");
    expect(mail.html.match(/<p style="margin:0 0 16px;">/g)?.length).toBeGreaterThan(1);
  });
});

describe("contactNotify", () => {
  it("puts the sender in the subject so the inbox is scannable", () => {
    const mail = contactNotify({
      siteUrl: SITE,
      name: "Amara Okafor",
      email: "amara@example.com",
      company: "Kite Ltd",
      supportArea: "Funding support",
      businessSector: "Technology & Software",
      message: "Partnership idea",
      leadId: "lead-123",
    });
    expect(mail.subject).toBe("[Inquiry] Amara Okafor · Funding support");
    expect(mail.html).toContain("amara@example.com");
    expect(mail.text).toContain("Support area: Funding support");
    expect(mail.text).toContain("Business sector: Technology & Software");
    expect(mail.html).toContain("lead-123");
  });

  it("falls back to the email address when no name was given", () => {
    const mail = contactNotify({
      siteUrl: SITE,
      name: "",
      email: "anon@example.com",
      message: "hi",
      leadId: null,
    });
    expect(mail.subject).toBe("[Inquiry] anon@example.com · General support");
  });
});

describe("newsletterWelcome", () => {
  it("includes the unsubscribe link when one is supplied", () => {
    const mail = newsletterWelcome({
      siteUrl: SITE,
      email: "sub@example.com",
      unsubscribeUrl: "https://fn.example.com/email-unsubscribe?token=abc",
    });
    expect(mail.html).toContain("email-unsubscribe?token=abc");
    expect(mail.html).toContain("Unsubscribe");
    expect(mail.text).toContain("Unsubscribe: https://fn.example.com/");
  });

  it("omits the unsubscribe link entirely when none is available", () => {
    const mail = newsletterWelcome({ siteUrl: SITE, email: "sub@example.com", unsubscribeUrl: null });
    expect(mail.html).not.toContain(">Unsubscribe<");
    expect(mail.text).not.toContain("Unsubscribe:");
  });
});

describe("resourceDelivery", () => {
  it("renders a download button for a valid file URL", () => {
    const mail = resourceDelivery({
      siteUrl: SITE,
      name: "Sam",
      resourceTitle: "Pitch Deck Template",
      fileUrl: "https://cdn.example.com/deck.pdf",
      resourceSlug: "pitch-deck-template",
    });
    expect(mail.subject).toBe("Your download: Pitch Deck Template");
    expect(mail.html).toContain("https://cdn.example.com/deck.pdf");
    expect(mail.text).toContain("Download: https://cdn.example.com/deck.pdf");
  });

  it("degrades to a follow-up promise rather than a dead button when the file is missing", () => {
    const mail = resourceDelivery({
      siteUrl: SITE,
      resourceTitle: "Coming Soon Guide",
      fileUrl: null,
      resourceSlug: null,
    });
    expect(mail.html).toContain("preparing your file");
    expect(mail.text).toContain("preparing your file");
  });

  it("drops a javascript: file URL instead of linking it", () => {
    const mail = resourceDelivery({
      siteUrl: SITE,
      resourceTitle: "Bad",
      fileUrl: "javascript:alert(1)",
      resourceSlug: null,
    });
    expect(mail.html).not.toContain("javascript:");
  });
});

describe("paymentReceipt", () => {
  it("formats NGN kobo as naira", () => {
    expect(formatAmount(9_500_000, "NGN")).toBe("₦95,000.00 NGN");
  });

  it("formats USD cents as dollars", () => {
    expect(formatAmount(20_000, "USD")).toBe("$200.00 USD");
  });

  it("renders the reference and the amount", () => {
    const mail = paymentReceipt({
      siteUrl: SITE,
      name: "Amara",
      amount: 9_500_000,
      currency: "NGN",
      reference: "cre_abc123",
      paidAt: "2026-07-27T10:00:00.000Z",
      expiresAt: "2027-07-27T10:00:00.000Z",
    });
    expect(mail.subject).toContain("₦95,000.00 NGN");
    expect(mail.html).toContain("cre_abc123");
    expect(mail.text).toContain("27 July 2026");
    expect(mail.text).toContain("27 July 2027");
  });

  it("omits date rows when the timestamps are unknown", () => {
    const mail = paymentReceipt({
      siteUrl: SITE,
      amount: 20_000,
      currency: "USD",
      reference: "cre_xyz",
      paidAt: null,
      expiresAt: null,
    });
    expect(mail.text).not.toContain("Paid on:");
    expect(mail.text).not.toContain("Access until:");
  });
});

describe("fundingAlert", () => {
  it.each([
    ["watchlist_opened", "now open"],
    ["closing_soon", "closing soon"],
    ["deadline_changed", "deadline changed"],
  ] as const)("renders %s with a safe official action", (eventType, expected) => {
    const mail = fundingAlert({
      siteUrl: SITE,
      eventType,
      opportunityTitle: "Climate Growth Fund",
      funder: "Example Foundation",
      applicationUrl: "https://example.org/apply",
      deadlineAt: "2026-09-01T23:59:00Z",
    });
    expect(mail.subject.toLowerCase()).toContain(expected);
    expect(mail.html).toContain("https://example.org/apply");
    expect(mail.text).toContain("Climate Growth Fund");
  });

  it("never renders an unsafe application URL", () => {
    const mail = fundingAlert({
      siteUrl: SITE,
      eventType: "watchlist_opened",
      opportunityTitle: "Unsafe",
      funder: "Example",
      applicationUrl: "javascript:alert(1)",
      deadlineAt: null,
    });
    expect(mail.html).not.toContain("javascript:");
    expect(mail.text).not.toContain("javascript:");
  });
});

describe("render() catalogue", () => {
  it("dispatches every kind and always produces subject + html + text", () => {
    const payloads = [
      { kind: "contact_ack", siteUrl: SITE, message: "hello there" },
      { kind: "contact_notify", siteUrl: SITE, email: "a@b.com", message: "hello" },
      { kind: "newsletter_welcome", siteUrl: SITE, email: "a@b.com" },
      { kind: "resource_delivery", siteUrl: SITE, resourceTitle: "Guide" },
      { kind: "payment_receipt", siteUrl: SITE, amount: 100, currency: "USD", reference: "r" },
      { kind: "funding_alert", siteUrl: SITE, eventType: "watchlist_opened", opportunityTitle: "Fund", funder: "Funder", applicationUrl: "https://example.org/apply", deadlineAt: null },
    ] as const;

    for (const payload of payloads) {
      const mail = render(payload as never);
      expect(mail.subject, payload.kind).toBeTruthy();
      expect(mail.html, payload.kind).toContain("<!doctype html>");
      expect(mail.text.length, payload.kind).toBeGreaterThan(20);
    }
  });

  it("throws on an unknown kind rather than sending a blank email", () => {
    expect(() => render({ kind: "nope" } as never)).toThrow(/Unhandled email kind/);
  });
});
