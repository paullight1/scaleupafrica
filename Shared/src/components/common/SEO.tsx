import { useEffect } from "react";
import type { JsonLd } from "@shared/lib/structuredData";
import {
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_ALT,
  absoluteUrl,
} from "@shared/lib/siteMeta";

interface SEOProps {
  title: string;
  description?: string;
  /**
   * Site-relative path or absolute URL; resolved against SITE_ORIGIN before it
   * is written to og:image. Defaults to the landing-hero social banner.
   */
  ogImage?: string;
  /** Alt text for the share image. Only set this alongside a custom `ogImage`. */
  ogImageAlt?: string;
  noindex?: boolean;
  /** Site-relative path for <link rel="canonical">; defaults to the current path. */
  canonical?: string;
  /** schema.org blocks — build them with the helpers in @shared/lib/structuredData. */
  jsonLd?: JsonLd | JsonLd[];
}

/** Marks the nodes this component owns, so a route change can clear them. */
const OWNED = "data-seo-jsonld";

/** Upsert a <meta> tag keyed by name/property. */
function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** Upsert <link rel="canonical">. */
function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Helper-free SEO: sets document.title and upserts description/OG/Twitter meta,
 * a canonical link, and any JSON-LD the page passes.
 *
 * Meta tags are last-write-wins and nothing is restored on unmount — an SPA
 * always has exactly one page mounted, so the next route overwrites them.
 * JSON-LD is the exception: <script> blocks accumulate rather than overwrite,
 * so these are tagged and removed on unmount. Leaving them would let a blog
 * post's Article markup describe the directory page the user navigated to.
 */
export function SEO({
  title,
  description,
  ogImage = DEFAULT_OG_IMAGE,
  ogImageAlt,
  noindex = false,
  canonical,
  jsonLd,
}: SEOProps) {
  useEffect(() => {
    const fullTitle = `${title} — ${SITE_NAME}`;
    document.title = fullTitle;

    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
      upsertMeta("name", "twitter:description", description);
    }

    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:card", "summary_large_image");

    if (ogImage) {
      // MUST be absolute — Facebook, LinkedIn, Slack and X all reject a
      // relative og:image outright and render a preview with no picture.
      const imageHref = absoluteUrl(ogImage);
      upsertMeta("property", "og:image", imageHref);
      upsertMeta("name", "twitter:image", imageHref);
      const alt = ogImageAlt ?? (ogImage === DEFAULT_OG_IMAGE ? OG_IMAGE_ALT : undefined);
      if (alt) {
        upsertMeta("property", "og:image:alt", alt);
        upsertMeta("name", "twitter:image:alt", alt);
      }
      if (ogImage === DEFAULT_OG_IMAGE) {
        // Dimensions let a crawler lay out the card before it fetches the file.
        upsertMeta("property", "og:image:width", OG_IMAGE_WIDTH);
        upsertMeta("property", "og:image:height", OG_IMAGE_HEIGHT);
      }
    }

    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");

    const path = canonical ?? (typeof window !== "undefined" ? window.location.pathname : "/");
    // Resolved against SITE_ORIGIN, never window.location.origin — otherwise a
    // preview deploy names itself canonical. Canonical URLs are also
    // deliberately query-free: /directory?industry=agri is the same document as
    // /directory as far as indexing goes.
    const canonicalHref = absoluteUrl(path);
    upsertCanonical(canonicalHref);
    upsertMeta("property", "og:url", canonicalHref);
  }, [title, description, ogImage, ogImageAlt, noindex, canonical]);

  // Serialised separately so an inline object literal in a page's JSX doesn't
  // re-run the effect on every render.
  const serialised = jsonLd ? JSON.stringify(jsonLd) : null;

  useEffect(() => {
    if (!serialised) return;
    const parsed: unknown = JSON.parse(serialised);
    const list: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

    const nodes = list.map((block) => {
      const el = document.createElement("script");
      el.setAttribute("type", "application/ld+json");
      el.setAttribute(OWNED, "");
      el.textContent = JSON.stringify(block);
      document.head.appendChild(el);
      return el;
    });

    return () => {
      nodes.forEach((el) => el.remove());
    };
  }, [serialised]);

  return null;
}

export default SEO;
