import { Controller, Get, Param, Res, Header } from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../auth/decorators";
import { ProfilesService } from "../profiles/profiles.service";

/**
 * OG-INJECTION CONTRACT (documented + functional) for `/directory/:slug`.
 *
 * PROBLEM (flagged by Plan 04): a Vite SPA ships one static index.html, so social
 * crawlers (Facebook, LinkedIn, WhatsApp, Slack, X) that DON'T run JS see generic
 * OG tags for every profile — bad share previews, the core directory "share loop".
 *
 * CONTRACT: this endpoint returns a minimal HTML document whose <head> carries the
 * per-profile og:/twitter: tags plus a `<link rel="canonical">` and a JS redirect to
 * the real SPA route (so a human who lands here still gets the app).
 *
 * DEPLOYMENT (documented for the orchestrator/HANDOFF — NOT wired here):
 *   Serve crawlers this HTML at the *real* path `/directory/:slug`. Options:
 *     (a) Edge/CDN rule: if `User-Agent` matches a crawler list, reverse-proxy
 *         `/directory/:slug` -> `${API}/api/v1/og/directory/:slug`; else serve the SPA.
 *     (b) A prerender service (prerender.io / Cloudflare) pointed at this endpoint.
 *   Humans keep hitting the SPA; only bots get the rendered head.
 *
 * This is intentionally a THIN, dependency-free renderer — no template engine.
 */
@Controller("og/directory")
export class OgController {
  constructor(private readonly profiles: ProfilesService) {}

  @Public()
  @Get(":slug")
  @Header("Content-Type", "text/html; charset=utf-8")
  async render(@Param("slug") slug: string, @Res() res: Response): Promise<void> {
    let title = "ScaleUp Africa";
    let description = "Discover African SMEs and funding opportunities.";
    let image = "/og-banner.png";
    let canonical = `/directory/${encodeURIComponent(slug)}`;

    try {
      const p = await this.profiles.getBySlug(slug);
      title = `${p.business_name} — ScaleUp Africa`;
      description =
        p.short_description ??
        `${p.business_name} is a ${p.sector} business in ${p.country} on ScaleUp Africa.`;
      image = p.logo_url ?? p.founder_photo_url ?? image;
      canonical = `/directory/${p.slug}`;
    } catch {
      res.status(404);
    }

    res.send(ogHtml({ title, description, image, canonical }));
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ogHtml(m: { title: string; description: string; image: string; canonical: string }): string {
  const t = esc(m.title);
  const d = esc(m.description);
  const img = esc(m.image);
  const url = esc(m.canonical);
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<title>${t}</title>
<meta name="description" content="${d}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${img}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${img}">
<meta http-equiv="refresh" content="0; url=${url}">
</head><body><p>Redirecting to <a href="${url}">${t}</a>…</p></body></html>`;
}
