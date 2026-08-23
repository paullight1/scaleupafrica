#!/usr/bin/env node
/**
 * Generates Frontend/public/sitemap.xml from the live database.
 *
 * Build-time rather than an edge function, deliberately: a sitemap has to be
 * served from the same host as the URLs it lists, and the site is a static SPA
 * bundle with no host-level rewrite config in the repo. Regenerating on every
 * deploy keeps /sitemap.xml aligned with the declared Cresciva production origin.
 *
 * Reads through PostgREST with the anon key, so it only ever sees what an
 * anonymous visitor sees — a draft post cannot leak into the sitemap even if
 * the status filters below were wrong.
 *
 * Failure is non-fatal: the previous sitemap.xml stays in place and the build
 * continues. A deploy should never break because the database was briefly
 * unreachable; a slightly stale sitemap is the strictly better failure.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_SITE_ORIGIN, normalizeSiteOrigin } from "../config/site-origin.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "Frontend/public/sitemap.xml");
const ROBOTS_OUT = resolve(ROOT, "Frontend/public/robots.txt");
const PAGE_SIZE = 1000;

/** Minimal .env reader — the script runs before Vite, so import.meta.env is out. */
function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/.exec(line);
    if (!match || line.trimStart().startsWith("#")) continue;
    out[match[1]] = (match[2] ?? "").trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const fileEnv = loadEnvFile(resolve(ROOT, "Frontend/.env"));
const env = { ...fileEnv, ...process.env };

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SITE_URL = normalizeSiteOrigin(
  env.SITE_ORIGIN || env.VITE_SITE_ORIGIN || DEFAULT_SITE_ORIGIN,
);

/**
 * Public routes, hand-maintained alongside Frontend/src/App.tsx.
 *
 * Excluded on purpose: /auth*, /dashboard/* and /directory/create (private, and
 * Disallowed in robots.txt), and /funding — it now redirects into the dashboard,
 * and listing a redirect wastes crawl budget. Restore it here if a public
 * funding page ships.
 */
const STATIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/directory", changefreq: "daily", priority: "0.9" },
  { path: "/resources", changefreq: "weekly", priority: "0.8" },
  { path: "/blog", changefreq: "daily", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/faq", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/disclaimer", changefreq: "yearly", priority: "0.3" },
];

/** Dynamic route sources. `status` is the value RLS also enforces. */
const COLLECTIONS = [
  { table: "profiles", status: "active", prefix: "/directory", changefreq: "weekly", priority: "0.7" },
  { table: "blog_posts", status: "published", prefix: "/blog", changefreq: "monthly", priority: "0.7" },
  { table: "resources", status: "published", prefix: "/resources", changefreq: "monthly", priority: "0.7" },
];

function xmlEscape(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** ISO timestamp → W3C date (YYYY-MM-DD); returns null for anything unparseable. */
function toLastmod(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

/** Fetch every row of one collection, paging past PostgREST's row cap. */
async function fetchRows({ table, status }) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const url =
      `${SUPABASE_URL}/rest/v1/${table}` +
      `?select=slug,updated_at&status=eq.${status}&order=updated_at.desc`;

    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
      },
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText} — ${(await res.text()).slice(0, 300)}`);
    }

    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function renderUrl({ path, lastmod, changefreq, priority }) {
  const lines = [
    "  <url>",
    `    <loc>${xmlEscape(`${SITE_URL}${path}`)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ];
  return lines.filter(Boolean).join("\n");
}

/**
 * robots.txt carries an absolute Sitemap: URL, so it shares the origin problem
 * with the sitemap itself. Written before any network call — a database outage
 * must not leave robots.txt pointing at a stale host.
 */
function writeRobots() {
  const body = [
    "# GENERATED by scripts/generate-sitemap.mjs — do not hand-edit.",
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /dashboard",
    "Disallow: /auth",
    "Disallow: /directory/create",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
  writeFileSync(ROBOTS_OUT, body, "utf8");
  console.log(`robots: ${SITE_URL}/sitemap.xml → ${ROBOTS_OUT}`);
}

async function main() {
  writeRobots();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY (checked process.env and Frontend/.env)",
    );
  }

  const entries = [...STATIC_ROUTES.map((r) => ({ ...r, lastmod: null }))];

  // All collections are fetched before anything is written, and every failure
  // is reported rather than just the first — a schema drift usually breaks more
  // than one table, and one run should show all of it. A partial sitemap is
  // never written: it would look complete while silently omitting a section.
  const results = await Promise.allSettled(COLLECTIONS.map(fetchRows));
  const failures = results
    .map((r, i) => (r.status === "rejected" ? `${COLLECTIONS[i].table}: ${r.reason.message}` : null))
    .filter(Boolean);
  if (failures.length > 0) throw new Error(failures.join("\n           "));

  results.forEach((result, i) => {
    const collection = COLLECTIONS[i];
    let skipped = 0;
    for (const row of result.value) {
      if (!row.slug) {
        skipped += 1;
        continue;
      }
      entries.push({
        path: `${collection.prefix}/${encodeURIComponent(row.slug)}`,
        lastmod: toLastmod(row.updated_at),
        changefreq: collection.changefreq,
        priority: collection.priority,
      });
    }
    const note = skipped ? ` (${skipped} skipped — no slug)` : "";
    console.log(`  ${collection.table}: ${result.value.length - skipped} urls${note}`);
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<!--",
    "  GENERATED by scripts/generate-sitemap.mjs — do not hand-edit.",
    "  Regenerate with `npm run sitemap`; `npm run build` does it automatically.",
    "-->",
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(renderUrl),
    "</urlset>",
    "",
  ].join("\n");

  writeFileSync(OUT, xml, "utf8");
  console.log(`sitemap: ${entries.length} urls → ${OUT}`);
}

main().catch((error) => {
  console.warn(`sitemap: skipped — ${error.message}`);
  console.warn("sitemap: keeping the existing Frontend/public/sitemap.xml");
  process.exit(0);
});
