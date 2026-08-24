import type { CampaignBlock, RenderedNewsletter, RenderNewsletterInput } from "./types";

const BRAND = {
  navy: "#1B2A4A",
  orange: "#E85D35",
  ink: "#28364F",
  muted: "#647089",
  border: "#E2E7EF",
  paper: "#F6F3EC",
} as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function safeLink(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function safeImage(value: string): string | null {
  const url = safeLink(value);
  return url?.startsWith("https://") ? url : null;
}

function paragraph(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function htmlBlock(block: CampaignBlock): string {
  switch (block.type) {
    case "heading": {
      const fontSize = block.level === 1 ? "30px" : "22px";
      return `<h${block.level} style="margin:0 0 18px;color:${BRAND.navy};font-family:Georgia,serif;font-size:${fontSize};line-height:1.2;">${escapeHtml(block.text)}</h${block.level}>`;
    }
    case "paragraph":
      return `<p style="margin:0 0 20px;color:${BRAND.ink};font-size:16px;line-height:1.7;">${paragraph(block.text)}</p>`;
    case "image": {
      const source = safeImage(block.url);
      if (!source) return "";
      const image = `<img src="${escapeHtml(source)}" alt="${escapeHtml(block.alt)}" width="568" style="display:block;width:100%;max-width:568px;height:auto;border:0;border-radius:12px;" />`;
      const href = safeLink(block.href);
      return `<div style="margin:0 0 24px;">${href ? `<a href="${escapeHtml(href)}">${image}</a>` : image}</div>`;
    }
    case "button": {
      const href = safeLink(block.url);
      if (!href) return `<p style="margin:0 0 20px;font-weight:700;color:${BRAND.navy};">${escapeHtml(block.label)}</p>`;
      return `<div style="margin:4px 0 24px;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 20px;border-radius:8px;background:${BRAND.orange};color:#ffffff;font-weight:700;text-decoration:none;">${escapeHtml(block.label)}</a></div>`;
    }
    case "divider":
      return `<hr style="margin:28px 0;border:0;border-top:1px solid ${BRAND.border};" />`;
    case "funding":
    case "resource": {
      const href = safeLink(block.url);
      const eyebrow = block.type === "funding" ? "Funding opportunity" : "Cresciva resource";
      const title = href
        ? `<a href="${escapeHtml(href)}" style="color:${BRAND.navy};text-decoration:none;">${escapeHtml(block.title)}</a>`
        : escapeHtml(block.title);
      return `<div style="margin:0 0 22px;padding:20px;border:1px solid ${BRAND.border};border-left:4px solid ${BRAND.orange};border-radius:10px;background:#ffffff;"><div style="margin-bottom:7px;color:${BRAND.orange};font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">${eyebrow}</div><div style="margin-bottom:8px;font-family:Georgia,serif;font-size:20px;font-weight:700;line-height:1.3;">${title}</div><div style="color:${BRAND.muted};font-size:14px;line-height:1.6;">${paragraph(block.summary)}</div></div>`;
    }
    case "social": {
      const links = block.links
        .map((link) => ({ ...link, safeUrl: safeLink(link.url) }))
        .filter((link) => link.safeUrl)
        .map((link) => `<a href="${escapeHtml(link.safeUrl!)}" style="margin-right:16px;color:${BRAND.navy};font-size:14px;font-weight:700;">${escapeHtml(link.label)}</a>`)
        .join("");
      return links ? `<div style="margin:8px 0 24px;">${links}</div>` : "";
    }
  }
}

function textBlock(block: CampaignBlock): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
      return block.text.trim();
    case "image": {
      const href = safeLink(block.href);
      return href ? `${block.alt}: ${href}` : block.alt.trim();
    }
    case "button": {
      const href = safeLink(block.url);
      return href ? `${block.label}: ${href}` : block.label.trim();
    }
    case "divider":
      return "---";
    case "funding":
    case "resource": {
      const href = safeLink(block.url);
      return [block.title, block.summary, href].filter(Boolean).join("\n");
    }
    case "social":
      return block.links
        .map((link) => {
          const href = safeLink(link.url);
          return href ? `${link.label}: ${href}` : "";
        })
        .filter(Boolean)
        .join("\n");
  }
}

export function renderNewsletter(input: RenderNewsletterInput): RenderedNewsletter {
  const body = input.blocks.map(htmlBlock).filter(Boolean).join("\n");
  const textBody = input.blocks.map(textBlock).filter(Boolean).join("\n\n");
  const preview = escapeHtml(input.previewText);
  const subject = input.subject.trim();

  return {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:${BRAND.paper};font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.paper};"><tr><td align="center" style="padding:32px 14px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
<tr><td style="padding:24px 34px;background:${BRAND.navy};color:#ffffff;font-family:Georgia,serif;font-size:22px;font-weight:700;">Cresciva <span style="color:#FF8A66;">Dispatch</span></td></tr>
<tr><td style="padding:36px 34px;">${body}</td></tr>
<tr><td style="padding:24px 34px;background:#F8FAFC;color:${BRAND.muted};font-size:12px;line-height:1.6;text-align:center;">You received this because you subscribed to Cresciva updates.<br><a href="{{ unsubscribe }}" style="color:${BRAND.navy};">Unsubscribe</a></td></tr>
</table></td></tr></table></body></html>`,
    text: `${subject}\n${"=".repeat(Math.min(subject.length, 72))}\n\n${textBody}\n\nUnsubscribe: {{ unsubscribe }}`,
  };
}
