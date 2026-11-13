import { describe, expect, it } from 'vitest';
import { parseGrantFeed, GRANT_FEEDS } from '../../../../supabase/functions/_shared/grantDiscovery';

const source = { name: 'Publisher', url: 'https://publisher.example/feed/', africaFocused: false };
const now = new Date('2026-11-04T12:00:00Z');
function item(title: string, link = 'https://publisher.example/grant/', body = 'African startups can apply for funding.', date = 'Tue, 03 Nov 2026 10:00:00 GMT') {
 return `<item><title><![CDATA[${title}]]></title><link>${link}</link><pubDate>${date}</pubDate><description><![CDATA[${body}]]></description><category>Grants</category></item>`;
}
function feed(items: string) { return `<rss version="2.0"><channel>${items}</channel></rss>`; }
describe('free grant discovery', () => {
 it('imports current African funding as published but never verified or open', () => {
  const [row] = parseGrantFeed(feed(item('Africa climate grant &amp; innovation')), source, now);
  expect(row).toMatchObject({ title: 'Africa climate grant & innovation', type: 'grant', status: 'published', verification_status: 'unverified', application_status: 'unknown', source_url: null, source_name: 'Publisher', last_verified_at: null });
  expect(row.summary).not.toContain('African startups can apply');
 });
 it('deduplicates canonical URLs without query tracking or fragments', () => {
  const rows = parseGrantFeed(feed(item('Africa grant', 'https://publisher.example/grant/?utm_source=rss#more') + item('Africa grant')), source, now);
  expect(rows).toHaveLength(1);
  expect(rows[0].url).toBe('https://publisher.example/grant/');
 });
 it('rejects unsafe and off-publisher links', () => {
  for (const link of ['javascript:alert(1)', 'http://publisher.example/grant/', 'https://evil.example/', 'https://publisher.example.evil.example/', 'https://u:p@publisher.example/grant/']) {
   expect(parseGrantFeed(feed(item('Africa grant', link)), source, now)).toEqual([]);
  }
 });
 it('rejects stale, undated, future, unrelated and region-restricted listings', () => {
  for (const date of ['Tue, 03 Nov 2024 10:00:00 GMT', '', 'Tue, 10 Nov 2026 10:00:00 GMT']) expect(parseGrantFeed(feed(item('Africa grant', undefined, undefined, date)), source, now)).toEqual([]);
  for (const [title, body] of [['Graduate engineering job', 'African applicants welcome'], ['Australia arts grant', 'Open only to Australian residents'], ['International Small Restaurants Grant', 'Open to restaurant owners in Australia and New Zealand.'], ['US local business grants', 'Available to US businesses only']]) {
   expect(parseGrantFeed(feed(item(title, undefined, body)), source, now)).toEqual([]);
  }
 });
 it('allows explicitly worldwide grants but never generic non-funding news', () => {
  expect(parseGrantFeed(feed(item('Innovation grant', undefined, 'Open worldwide to entrepreneurs in any country.')), source, now)).toHaveLength(1);
  expect(parseGrantFeed(feed(item('Africa business news', undefined, 'News for entrepreneurs.')), source, now)).toHaveLength(0);
 });
 it('rejects invalid payloads and never executes or renders source markup', () => {
  expect(() => parseGrantFeed('<html>Cloudflare challenge</html>', source, now)).toThrow();
  expect(() => parseGrantFeed('<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>', source, now)).toThrow();
  const [row] = parseGrantFeed(feed(item('<b>Africa grant</b><script>alert(1)</script>')), source, now);
  expect(row.title).toBe('Africa grant');
 });
 it('rejects grant roundups and advice articles instead of treating them as applications', () => {
  for (const title of ['Top 10 grants for African startups', 'How to apply for funding in Africa', 'A list of grants for African SMEs']) {
   expect(parseGrantFeed(feed(item(title)), source, now)).toEqual([]);
  }
 });
 it('rejects malformed nested or unclosed item floods without rescanning the feed', () => {
  const malformed = '<rss><channel>' + '<item>'.repeat(40000) + '</channel></rss>';
  const start = performance.now();
  expect(() => parseGrantFeed(malformed, source, now)).toThrow('invalid_rss');
  expect(performance.now() - start).toBeLessThan(1000);
 });
 it('accepts XML whitespace in item closing tags', () => {
  for (const close of ['</item >', '</item\n>']) {
   expect(parseGrantFeed(feed(item('Africa grant').replace('</item>', close)), source, now)).toHaveLength(1);
  }
 });
 it('uses only bounded fixed public feeds', () => {
  expect(GRANT_FEEDS.length).toBeLessThanOrEqual(10);
  expect(GRANT_FEEDS.every(s => s.url.startsWith('https://'))).toBe(true);
 });
});
