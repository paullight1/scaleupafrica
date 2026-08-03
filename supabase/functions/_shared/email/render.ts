// =============================================================================
// HTML email rendering primitives — escaping, layout shell, buttons.
//
// Pure TypeScript (no Deno globals, no npm: imports) — unit-tested under Vitest.
//
// SECURITY: every value that reaches the HTML goes through `esc()`. Emails are
// assembled from user-supplied strings (names, messages, company names), so an
// unescaped interpolation is a stored-XSS vector in webmail clients. There is no
// "trusted" caller — `esc()` is applied at the template layer, always.
// =============================================================================

import { BRAND } from "./config.ts";

/** Escape for HTML text and double-quoted attribute contexts. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Return an absolute http/https href, or null for anything else. Mirrors
 * `sanitizeExternalUrl` in _shared/fundingSchema.ts — no `javascript:`, `data:`
 * or relative string may ever reach an <a href>.
 */
export function safeUrl(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  try {
    const url = new URL(String(raw).trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Collapse a multi-line user message into escaped HTML paragraphs. */
export function paragraphs(text: string): string {
  return String(text ?? "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p style="margin:0 0 16px;">${esc(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

/** A bulletproof-ish table button. Renders acceptably in Outlook and Gmail. */
export function button(label: string, href: string): string {
  const safe = safeUrl(href);
  if (!safe) return "";
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr>
        <td align="center" bgcolor="${BRAND.orangeDark}" style="border-radius:10px;">
          <a href="${esc(safe)}"
             style="display:inline-block;padding:13px 26px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:${BRAND.white};text-decoration:none;border-radius:10px;">
            ${esc(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

export interface LayoutOptions {
  /** Preheader text — the grey preview line next to the subject in most inboxes. */
  preheader?: string;
  /** Absolute site URL used by the header wordmark + footer links. */
  siteUrl: string;
  /** Optional unsubscribe link appended to the footer. */
  unsubscribeUrl?: string | null;
  /** Extra footer line, e.g. "You're receiving this because you contacted us." */
  footerNote?: string;
}

/**
 * Wrap body HTML in the branded shell. Table-based and inline-styled — email
 * clients strip <style> blocks and ignore flexbox/grid.
 */
export function layout(bodyHtml: string, opts: LayoutOptions): string {
  const site = safeUrl(opts.siteUrl) ?? "https://cresciva.com";
  const unsub = opts.unsubscribeUrl ? safeUrl(opts.unsubscribeUrl) : null;

  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>`
    : "";

  const footerLinks = [
    `<a href="${esc(site)}" style="color:${BRAND.inkMuted};text-decoration:underline;">cresciva.com</a>`,
    `<a href="${esc(site)}/privacy" style="color:${BRAND.inkMuted};text-decoration:underline;">Privacy</a>`,
    unsub
      ? `<a href="${esc(unsub)}" style="color:${BRAND.inkMuted};text-decoration:underline;">Unsubscribe</a>`
      : "",
  ]
    .filter(Boolean)
    .join(' <span style="color:#B8C2D4;">&middot;</span> ');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${esc(BRAND.name)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.surface};">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.surface};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:${BRAND.white};border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;">
        <tr>
          <td style="background-color:${BRAND.navy};padding:22px 32px;">
            <a href="${esc(site)}" style="font-family:Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;letter-spacing:-0.2px;color:${BRAND.white};text-decoration:none;">
              ${esc(BRAND.name)}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.ink};">
            ${bodyHtml}
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td style="padding:20px 32px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.inkMuted};text-align:center;">
            ${opts.footerNote ? `<p style="margin:0 0 8px;">${esc(opts.footerNote)}</p>` : ""}
            <p style="margin:0 0 8px;">${footerLinks}</p>
            <p style="margin:0;color:#9AA7BC;">&copy; ${esc(BRAND.name)}. ${esc(BRAND.tagline)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Heading + lead-paragraph helpers so templates stay declarative. */
export function h1(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.ink};">${esc(text)}</h1>`;
}

export function p(text: string): string {
  return `<p style="margin:0 0 16px;">${esc(text)}</p>`;
}

/** A bordered detail block, used for quoting a submitted message back to the sender. */
export function quote(innerHtml: string): string {
  return `<div style="margin:0 0 20px;padding:16px 18px;background-color:${BRAND.surface};border-left:3px solid ${BRAND.orange};border-radius:0 8px 8px 0;">${innerHtml}</div>`;
}

/** Label/value rows for the internal notification email. */
export function definitions(rows: Array<[string, string]>): string {
  const cells = rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;font-size:13px;color:${BRAND.inkMuted};white-space:nowrap;vertical-align:top;">${esc(label)}</td>
          <td style="padding:6px 0;font-size:14px;color:${BRAND.ink};">${esc(value)}</td>
        </tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 20px;">${cells}</table>`;
}
