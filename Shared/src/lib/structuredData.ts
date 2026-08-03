/**
 * schema.org builders for the JSON-LD blocks the SEO component injects.
 *
 * These exist so pages never hand-write `@type` strings: rich results are
 * silently dropped when a required field is missing, and a typo'd key is
 * indistinguishable from no markup at all. Every builder strips undefined
 * fields so an optional value never emits `"key": null`, which Google treats
 * as a malformed value rather than an absent one.
 */

export type JsonLd = Record<string, unknown>;

const SITE_NAME = "Cresciva";

/** Absolute URL for a site-relative path; JSON-LD requires absolute URLs. */
export function absoluteUrl(path: string, origin?: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Drop undefined/null/empty-string entries, recursively through objects. */
function compact<T extends JsonLd>(obj: T): T {
  const out: JsonLd = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out as T;
}

/** The publisher block — the site itself. Belongs on the landing page. */
export function organizationLd(opts: { url?: string; logo?: string; sameAs?: string[] } = {}): JsonLd {
  return compact({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    description:
      "Visibility and funding intelligence for Pan-African SME founders — a searchable business directory and curated funding opportunities.",
    url: absoluteUrl(opts.url ?? "/"),
    logo: opts.logo ? absoluteUrl(opts.logo) : undefined,
    sameAs: opts.sameAs,
  });
}

/** A directory listing. `url` should be the profile's own /directory/:slug path. */
export function localBusinessLd(opts: {
  name: string;
  description?: string;
  url: string;
  image?: string;
  industry?: string;
  city?: string;
  country?: string;
  website?: string;
  foundedYear?: number | string;
}): JsonLd {
  const address = compact({
    "@type": "PostalAddress",
    addressLocality: opts.city,
    addressCountry: opts.country,
  });

  return compact({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: opts.name,
    description: opts.description,
    url: absoluteUrl(opts.url),
    image: opts.image ? absoluteUrl(opts.image) : undefined,
    // The SME's own site, when they have one — distinct from `url`, which is
    // the Cresciva listing Google should link to.
    sameAs: opts.website ? [opts.website] : undefined,
    knowsAbout: opts.industry,
    foundingDate: opts.foundedYear ? String(opts.foundedYear) : undefined,
    address: Object.keys(address).length > 1 ? address : undefined,
  });
}

/** A blog post. `datePublished` must be ISO 8601. */
export function articleLd(opts: {
  headline: string;
  description?: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
}): JsonLd {
  return compact({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    mainEntityOfPage: absoluteUrl(opts.url),
    image: opts.image ? absoluteUrl(opts.image) : undefined,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    author: opts.authorName ? { "@type": "Person", name: opts.authorName } : undefined,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  });
}

/** An FAQ block. Google only renders this when the answers are visible on-page. */
export function faqPageLd(items: { question: string; answer: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}

/** Breadcrumb trail; pass items in order, root first. */
export function breadcrumbLd(items: { name: string; url: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.url),
    })),
  };
}
