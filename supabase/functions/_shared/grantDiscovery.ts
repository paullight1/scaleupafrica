/** Fixed public RSS sources; no AI, credentials, headless browser or paid API. */
export interface GrantFeed { name: string; url: string; africaFocused: boolean }
export const GRANT_FEEDS: GrantFeed[] = [
  { name: 'Opportunity Desk', url: 'https://opportunitydesk.org/category/grants/feed/', africaFocused: false },
  { name: 'Opportunity Desk', url: 'https://opportunitydesk.org/category/grants/feed/?paged=2', africaFocused: false },
  { name: 'Opportunities for Africans', url: 'https://www.opportunitiesforafricans.com/feed/', africaFocused: true },
  { name: 'Opportunities for Africans', url: 'https://www.opportunitiesforafricans.com/feed/?paged=2', africaFocused: true },
  { name: 'Terra Viva Grants', url: 'https://www.terravivagrants.org/feed/', africaFocused: false },
  { name: 'Terra Viva Grants', url: 'https://www.terravivagrants.org/feed/?paged=2', africaFocused: false },
];
export const DISCOVERY_IMPORTER = 'free_rss_v1';
const AFRICA = /\b(africa[n]?|nigeria[n]?|kenya[n]?|ghana[ian]*|uganda[n]?|rwanda[n]?|tanzania[n]?|ethiopia[n]?|zambia[n]?|zimbabwe[an]*|senegal[ese]*|cameroon[ian]*|morocco|egypt[ian]*|tunisia[n]?|algeria[n]?|malawi[an]*|mozambique|botswana|namibia[n]?|sierra leone|liberia[n]?|somalia[n]?|sudan[ese]*|sahel|congo|burkina faso|cote d.ivoire|ivory coast|mauritius|mauritania|madagascar|benin|togo|eswatini|lesotho|gambia|guinea|gabon|chad|niger|mali|angola|eritrea|burundi|djibouti|seychelles|comoros|cabo verde|cape verde)\b/i;
const GLOBAL = /\b(worldwide|global|any country|all countries|developing countries|least developed countries)\b/i;
const FUNDING = /\b(grants?|funding|fund|seed capital|prize|awards?|pitch|accelerator|incubat(?:or|ion)|entrepreneur(?:ship)?|startups?|start-ups?|smes?|msmes?)\b/i;
const ROUNDUP = /^(?:(?:top|best)\s+\d+\b|how to\b)|\b(?:list|roundup|collection) of\b/i;
const EXCLUDED = /\b(scholarships?|graduate programme|graduate program|internships?|job vacancy|job vacancies|recruitment|master.s degree|phd scholarship)\b/i;

export interface GrantDiscoveryRow {
  title: string; funder: string; type: string; summary: string; url: string;
  source_url: null; source_name: string; source_fingerprint: string;
  source_retrieved_at: string; source: string; status: 'published'; featured: false;
  verification_status: 'unverified'; application_status: 'unknown'; deadline_status: 'unknown';
  last_verified_at: null; tags: string[]; country_focus: string[];
  details: { discovery_importer: string; publisher: string; published_at: string; feed_url: string };
}

/** Only accepts bounded RSS 2.0. Does not expand XML entities or render HTML. */
export function parseGrantFeed(xml: string, source: GrantFeed, now = new Date()): GrantDiscoveryRow[] {
  if (xml.length > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml) || !/<rss\b/i.test(xml) || !/<channel\b/i.test(xml) || !/<\/rss\s*>/i.test(xml)) {
    throw new Error('invalid_rss');
  }
  const rows: GrantDiscoveryRow[] = [];
  const seen = new Set<string>();
  const origin = new URL(source.url).origin;
  // Advance a single cursor. A regex matching whole items backtracks quadratically
  // when many opening tags have no close tag, even if results are consumed lazily.
  const opening = /<item\b[^>]*>/gi;
  const closing = /<\/item\s*>/gi;
  let examined = 0;
  let match: RegExpExecArray | null;
  while (examined++ < 50 && (match = opening.exec(xml))) {
    const start = opening.lastIndex;
    closing.lastIndex = start;
    const end = closing.exec(xml);
    if (!end) throw new Error('invalid_rss');
    const item = xml.slice(start, end.index);
    if (/<item\b/i.test(item)) throw new Error('invalid_rss');
    opening.lastIndex = closing.lastIndex;
    const title = plainText(field(item, 'title')).slice(0, 200);
    const publishedAt = new Date(plainText(field(item, 'pubDate')));
    const age = now.getTime() - publishedAt.getTime();
    if (!title || !Number.isFinite(age) || age < -3_600_000 || age > 45 * 86_400_000) continue;
    const url = canonicalPublisherUrl(plainText(field(item, 'link')), origin);
    if (!url || seen.has(url)) continue;
    const body = plainText(field(item, 'description') + ' ' + field(item, 'content:encoded'));
    const text = title + ' ' + body;
    if (!FUNDING.test(title) || EXCLUDED.test(title) || ROUNDUP.test(title)) continue;
    if (!source.africaFocused && !AFRICA.test(text) && !GLOBAL.test(text)) continue;
    const type = /\baccelerator|incubat(?:or|ion)\b/i.test(title) ? 'accelerator' : /\bprize|awards?|competition|challenge\b/i.test(title) ? 'competition' : /\bgrants?|funding|fund|seed capital\b/i.test(title) ? 'grant' : 'other';
    seen.add(url);
    rows.push({
      title, funder: `See ${source.name} listing`, type,
      summary: `Funding discovery from ${source.name}. Check the source for the funder, eligible countries, deadline and application requirements. Availability has not yet been independently verified.`,
      url, source_url: null, source_name: source.name, source_fingerprint: `${DISCOVERY_IMPORTER}:${url}`,
      source_retrieved_at: now.toISOString(), source: 'manual', status: 'published', featured: false,
      verification_status: 'unverified', application_status: 'unknown', deadline_status: 'unknown', last_verified_at: null,
      tags: ['funding', type, 'discovery'], country_focus: [],
      details: { discovery_importer: DISCOVERY_IMPORTER, publisher: source.name, published_at: publishedAt.toISOString(), feed_url: source.url },
    });
  }
  return rows;
}

function field(item: string, tag: string): string {
  return item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}\\s*>`, 'i'))?.[1] ?? '';
}
function plainText(value: string): string {
  const text = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (full, entity: string) => {
      if (entity.startsWith('#')) {
        const n = entity.toLowerCase().startsWith('#x') ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
      }
      return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' } as Record<string, string>)[entity.toLowerCase()] ?? full;
    });
  return text.replace(/\s+/g, ' ').trim();
}
function canonicalPublisherUrl(raw: string, origin: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password || url.pathname === '/') return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^(fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch { return null; }
}
