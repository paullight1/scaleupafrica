export type ResourceDeliveryKind = "none" | "upload" | "link";

export type ResourceLinkMetadata = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

export function resourceDeliveryKind(fileUrl: string | null | undefined): ResourceDeliveryKind {
  if (!fileUrl?.trim()) return "none";
  try {
    const url = new URL(fileUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "none";
    return /\/storage\/v1\/object\/(?:public|sign)\/resource-files(?:\/|$)/.test(url.pathname)
      ? "upload"
      : "link";
  } catch {
    return "none";
  }
}

export function parseResourceLinkMetadata(
  html: string,
  finalUrl: string,
): ResourceLinkMetadata {
  const baseUrl = cleanHttpUrl(finalUrl, finalUrl) ?? finalUrl;
  const meta = collectMetadata(html);
  const canonical = findLinkHref(html, "canonical");
  const title = firstText(meta.get("property:og:title"), meta.get("name:twitter:title"), readTitle(html));
  const description = firstText(
    meta.get("property:og:description"),
    meta.get("name:twitter:description"),
    meta.get("name:description"),
  );
  const image = firstText(meta.get("property:og:image"), meta.get("name:twitter:image"));
  const siteName = firstText(meta.get("property:og:site_name")) ?? hostname(baseUrl);

  return {
    url: cleanHttpUrl(canonical, baseUrl) ?? baseUrl,
    title,
    description,
    imageUrl: cleanHttpUrl(image, baseUrl),
    siteName,
  };
}

function collectMetadata(html: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const content = attrs.get("content");
    if (!content) continue;
    for (const key of ["property", "name"] as const) {
      const value = attrs.get(key)?.toLowerCase();
      if (value && !values.has(`${key}:${value}`)) {
        values.set(`${key}:${value}`, decodeHtml(content).trim());
      }
    }
  }
  return values;
}

function findLinkHref(html: string, rel: string): string | null {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (attrs.get("rel")?.toLowerCase().split(/\s+/).includes(rel)) {
      return attrs.get("href") ?? null;
    }
  }
  return null;
}

function attributes(tag: string): Map<string, string> {
  const values = new Map<string, string>();
  const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of tag.matchAll(pattern)) {
    values.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }
  return values;
}

function readTitle(html: string): string | null {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? firstText(decodeHtml(match[1].replace(/<[^>]+>/g, " "))) : null;
}

function firstText(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const cleaned = value?.replace(/\s+/g, " ").trim();
    if (cleaned) return cleaned;
  }
  return null;
}

function cleanHttpUrl(value: string | null | undefined, base: string): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(decodeHtml(value.trim()), base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function hostname(value: string): string | null {
  try {
    return new URL(value).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] !== "#") return named[code.toLowerCase()] ?? entity;
    const point = code[1]?.toLowerCase() === "x"
      ? Number.parseInt(code.slice(2), 16)
      : Number.parseInt(code.slice(1), 10);
    return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
  });
}
