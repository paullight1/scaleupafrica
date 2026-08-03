// =============================================================================
// Email templates — one pure function per message.
//
// Every template returns a fully-rendered { subject, html, text } and takes ONLY
// plain data. No I/O, no Deno globals, no npm: imports — so the whole catalogue
// is snapshot-testable under Vitest (Frontend/src/lib/__tests__/email-templates.test.ts).
//
// Every interpolated value passes through esc()/safeUrl() in render.ts. A plain
// text alternative is always produced: text-only clients and spam filters both
// penalise HTML-only mail.
// =============================================================================

import { BRAND } from "./config.ts";
import { button, definitions, esc, h1, layout, p, paragraphs, quote, safeUrl } from "./render.ts";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

interface BaseCtx {
  siteUrl: string;
  unsubscribeUrl?: string | null;
}

// --- helpers -----------------------------------------------------------------

/** First name if we have one, else a neutral greeting that never reads as broken. */
function greet(name?: string | null): string {
  const first = String(name ?? "").trim().split(/\s+/)[0];
  return first ? `Hi ${first},` : "Hi there,";
}

/**
 * Integer subunits -> display string. Amounts are ALWAYS integer kobo/cents
 * (see _shared/billing.ts) — never floats, so this divides exactly once here.
 */
export function formatAmount(subunits: number, currency: string): string {
  const major = Number(subunits) / 100;
  const code = String(currency ?? "").toUpperCase();
  const symbol = code === "NGN" ? "₦" : code === "USD" ? "$" : "";
  const formatted = major.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return symbol ? `${symbol}${formatted} ${code}` : `${formatted} ${code}`;
}

function textFooter(ctx: BaseCtx): string {
  const lines = [``, `— ${BRAND.name}`, ctx.siteUrl];
  if (ctx.unsubscribeUrl) lines.push(``, `Unsubscribe: ${ctx.unsubscribeUrl}`);
  return lines.join("\n");
}

// --- 1. Contact form: acknowledgement to the person who wrote in --------------

export interface ContactAckCtx extends BaseCtx {
  name?: string | null;
  message: string;
}

export function contactAck(ctx: ContactAckCtx): RenderedEmail {
  const body =
    h1("Thanks — we've got your message.") +
    p(greet(ctx.name).replace(/,$/, "") + " — a real person reads every message that comes through the form, and we typically reply within a couple of business days.") +
    p("Here's what you sent us, for your records:") +
    quote(paragraphs(ctx.message)) +
    p("While you wait, the founder resource library is free and open:") +
    button("Browse the resources", `${ctx.siteUrl}/resources`);

  const text = [
    greet(ctx.name),
    ``,
    `Thanks for reaching out to ${BRAND.name}. A real person reads every message and we typically reply within a couple of business days.`,
    ``,
    `Your message:`,
    ctx.message.trim(),
    ``,
    `Browse the free resource library: ${ctx.siteUrl}/resources`,
    textFooter(ctx),
  ].join("\n");

  return {
    subject: `We got your message — ${BRAND.name}`,
    html: layout(body, {
      siteUrl: ctx.siteUrl,
      preheader: "A real person reads every message. We usually reply within two business days.",
      footerNote: "You're receiving this because you sent us a message on cresciva.com.",
    }),
    text,
  };
}

// --- 2. Contact form: internal notification to the team -----------------------

export interface ContactNotifyCtx extends BaseCtx {
  name?: string | null;
  email: string;
  company?: string | null;
  message: string;
  leadId?: string | null;
}

export function contactNotify(ctx: ContactNotifyCtx): RenderedEmail {
  const body =
    h1("New contact form submission") +
    definitions([
      ["Name", ctx.name ?? "—"],
      ["Email", ctx.email],
      ["Company", ctx.company ?? "—"],
      ["Lead ID", ctx.leadId ?? "—"],
    ]) +
    quote(paragraphs(ctx.message)) +
    p("Reply directly to this email to answer them — the reply-to is set to the sender.");

  const text = [
    `New contact form submission`,
    ``,
    `Name:    ${ctx.name ?? "—"}`,
    `Email:   ${ctx.email}`,
    `Company: ${ctx.company ?? "—"}`,
    `Lead ID: ${ctx.leadId ?? "—"}`,
    ``,
    `Message:`,
    ctx.message.trim(),
  ].join("\n");

  return {
    // Sender name in the subject makes the internal inbox scannable.
    subject: `[Lead] ${ctx.name?.trim() || ctx.email} via the contact form`,
    html: layout(body, { siteUrl: ctx.siteUrl, preheader: `From ${ctx.email}` }),
    text,
  };
}

// --- 3. Newsletter welcome ---------------------------------------------------

export interface NewsletterWelcomeCtx extends BaseCtx {
  email: string;
}

export function newsletterWelcome(ctx: NewsletterWelcomeCtx): RenderedEmail {
  const body =
    h1("You're on the list.") +
    p("Thanks for subscribing. You'll get a short, useful email when there's genuinely something worth your time — new funding calls, a new playbook, or a change that affects your profile. No filler, no daily blasts.") +
    p("Two things worth doing right now:") +
    `<ul style="margin:0 0 20px;padding-left:20px;color:${BRAND.ink};">
       <li style="margin-bottom:8px;">Claim your directory profile so funders and partners can actually find you.</li>
       <li style="margin-bottom:8px;">Skim the resource library — templates and playbooks, free.</li>
     </ul>` +
    button("Create your profile", `${ctx.siteUrl}/directory/create`) +
    p("If this wasn't you, ignore this email — or use the unsubscribe link below and you'll hear nothing more.");

  const text = [
    `You're on the list.`,
    ``,
    `Thanks for subscribing to ${BRAND.name}. You'll get a short, useful email when there's genuinely something worth your time — new funding calls, a new playbook, or a change that affects your profile.`,
    ``,
    `Create your profile: ${ctx.siteUrl}/directory/create`,
    `Browse resources:    ${ctx.siteUrl}/resources`,
    textFooter(ctx),
  ].join("\n");

  return {
    subject: `Welcome to ${BRAND.name}`,
    html: layout(body, {
      siteUrl: ctx.siteUrl,
      unsubscribeUrl: ctx.unsubscribeUrl,
      preheader: "Short, useful emails only — funding calls, playbooks, and profile news.",
      footerNote: `You subscribed with ${ctx.email}.`,
    }),
    text,
  };
}

// --- 4. Gated resource delivery ---------------------------------------------

export interface ResourceDeliveryCtx extends BaseCtx {
  name?: string | null;
  resourceTitle: string;
  /** Public file URL. Sanitised here; the template renders no button without it. */
  fileUrl?: string | null;
  resourceSlug?: string | null;
}

export function resourceDelivery(ctx: ResourceDeliveryCtx): RenderedEmail {
  const file = safeUrl(ctx.fileUrl);
  const permalink = ctx.resourceSlug ? `${ctx.siteUrl}/resources/${encodeURIComponent(ctx.resourceSlug)}` : null;

  const body =
    h1("Your download is ready") +
    p(greet(ctx.name).replace(/,$/, "") + ` — here's ${ctx.resourceTitle}, as promised.`) +
    (file
      ? button("Download it now", file)
      : p("We're preparing your file and will follow up shortly with the download link.")) +
    (permalink
      ? p(`You can always find it again on the resource page: ${permalink}`)
      : "") +
    p("If it's useful, the rest of the library is free too — templates, playbooks and guides built for African SMEs.") +
    button("Browse the library", `${ctx.siteUrl}/resources`);

  const text = [
    greet(ctx.name),
    ``,
    `Here's ${ctx.resourceTitle}, as promised.`,
    ``,
    file ? `Download: ${file}` : `We're preparing your file and will follow up shortly with the download link.`,
    permalink ? `Resource page: ${permalink}` : ``,
    ``,
    `Browse the full library: ${ctx.siteUrl}/resources`,
    textFooter(ctx),
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    subject: `Your download: ${ctx.resourceTitle}`,
    html: layout(body, {
      siteUrl: ctx.siteUrl,
      unsubscribeUrl: ctx.unsubscribeUrl,
      preheader: `${ctx.resourceTitle} — download link inside.`,
      footerNote: "You're receiving this because you requested this download on cresciva.com.",
    }),
    text,
  };
}

// --- 5. Payment receipt / subscription activated -----------------------------

export interface PaymentReceiptCtx extends BaseCtx {
  name?: string | null;
  /** Integer subunits (kobo / cents). */
  amount: number;
  currency: string;
  reference: string;
  /** ISO date the access expires, if known. */
  expiresAt?: string | null;
  paidAt?: string | null;
}

function isoToLongDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function paymentReceipt(ctx: PaymentReceiptCtx): RenderedEmail {
  const amount = formatAmount(ctx.amount, ctx.currency);
  const expires = isoToLongDate(ctx.expiresAt);
  const paid = isoToLongDate(ctx.paidAt);

  const body =
    h1("Payment received — your access is live") +
    p(greet(ctx.name).replace(/,$/, "") + " — thanks. Your annual membership is active, and the Funding Radar is unlocked right now.") +
    definitions([
      ["Amount", amount],
      ["Reference", ctx.reference],
      ["Paid on", paid],
      ["Access until", expires],
    ]) +
    button("Open the Funding Radar", `${ctx.siteUrl}/funding`) +
    p("Keep this email as your receipt. Questions about billing? Just reply to this message.");

  const text = [
    greet(ctx.name),
    ``,
    `Thanks — your ${BRAND.name} annual membership is active and the Funding Radar is unlocked.`,
    ``,
    `Amount:       ${amount}`,
    `Reference:    ${ctx.reference}`,
    paid ? `Paid on:      ${paid}` : ``,
    expires ? `Access until: ${expires}` : ``,
    ``,
    `Open the Funding Radar: ${ctx.siteUrl}/funding`,
    ``,
    `Keep this email as your receipt. Reply to this message with any billing questions.`,
    textFooter(ctx),
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    subject: `Your ${BRAND.name} receipt — ${amount}`,
    html: layout(body, {
      siteUrl: ctx.siteUrl,
      preheader: `Payment of ${amount} received. Your membership is active.`,
      footerNote: "This is a transactional receipt for a purchase you made on cresciva.com.",
    }),
    text,
  };
}

// --- catalogue ---------------------------------------------------------------

/**
 * The discriminated union of everything the platform can send. `dispatch.ts`
 * switches on `kind`; adding a template means adding a member here so the
 * exhaustiveness check in dispatch.ts fails to compile if it's left unhandled.
 */
export type EmailPayload =
  | ({ kind: "contact_ack" } & ContactAckCtx)
  | ({ kind: "contact_notify" } & ContactNotifyCtx)
  | ({ kind: "newsletter_welcome" } & NewsletterWelcomeCtx)
  | ({ kind: "resource_delivery" } & ResourceDeliveryCtx)
  | ({ kind: "payment_receipt" } & PaymentReceiptCtx);

export type EmailKind = EmailPayload["kind"];

export function render(payload: EmailPayload): RenderedEmail {
  switch (payload.kind) {
    case "contact_ack":
      return contactAck(payload);
    case "contact_notify":
      return contactNotify(payload);
    case "newsletter_welcome":
      return newsletterWelcome(payload);
    case "resource_delivery":
      return resourceDelivery(payload);
    case "payment_receipt":
      return paymentReceipt(payload);
    default: {
      const never: never = payload;
      throw new Error(`Unhandled email kind: ${JSON.stringify(never)}`);
    }
  }
}

/** Escape hatch used by the internal-notification subject; exported for tests. */
export { esc };
