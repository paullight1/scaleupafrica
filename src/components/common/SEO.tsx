import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  /** Absolute path; defaults to the social banner once plan 08 ships it. */
  ogImage?: string;
  noindex?: boolean;
}

const SITE_NAME = "Cresciva";

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

/**
 * Helper-free SEO: sets document.title and upserts description/OG/Twitter meta.
 * Last-write-wins for an SPA — nothing is restored on unmount. Per-route values
 * are owned by plan 08; this component owns the mechanism.
 */
export function SEO({ title, description, ogImage = "/og-banner.png", noindex = false }: SEOProps) {
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
      upsertMeta("property", "og:image", ogImage);
      upsertMeta("name", "twitter:image", ogImage);
    }

    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
  }, [title, description, ogImage, noindex]);

  return null;
}

export default SEO;
