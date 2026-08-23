import { promises as fs } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { SITE_ORIGIN } from "../config/site-origin.js";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "Frontend", "dist");
const ADMIN_DIST = path.join(DIST, "admin");

const limits = {
  publicJsTotalGzip: Number(process.env.WEB_BUDGET_PUBLIC_JS_GZIP ?? 2_500_000),
  publicLargestJsGzip: Number(process.env.WEB_BUDGET_PUBLIC_CHUNK_GZIP ?? 750_000),
  adminJsTotalGzip: Number(process.env.WEB_BUDGET_ADMIN_JS_GZIP ?? 2_500_000),
  cssTotalGzip: Number(process.env.WEB_BUDGET_CSS_GZIP ?? 300_000),
};

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

async function gzipBytes(file) {
  return gzipSync(await fs.readFile(file)).byteLength;
}

async function collect(dir, extension) {
  const files = (await walk(dir)).filter((file) => file.endsWith(extension));
  const rows = await Promise.all(files.map(async (file) => ({ file, gzip: await gzipBytes(file) })));
  return {
    rows,
    total: rows.reduce((sum, row) => sum + row.gzip, 0),
    largest: rows.reduce((max, row) => Math.max(max, row.gzip), 0),
  };
}

function requireText(text, needle, label) {
  if (!text.includes(needle)) throw new Error(`${label} missing required value: ${needle}`);
}

function rejectText(text, pattern, label) {
  if (pattern.test(text)) throw new Error(`${label} contains forbidden value matching ${pattern}`);
}

async function verifyMetadata() {
  const index = await fs.readFile(path.join(DIST, "index.html"), "utf8");
  requireText(index, "Cresciva", "index.html");
  requireText(index, SITE_ORIGIN, "index.html");
  requireText(index, 'property="og:image"', "index.html");
  rejectText(index, /ScaleUp Africa/i, "index.html");
  rejectText(index, /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, "index.html");

  for (const file of ["sitemap.xml", "robots.txt"]) {
    const text = await fs.readFile(path.join(DIST, file), "utf8");
    requireText(text, SITE_ORIGIN, file);
    rejectText(text, /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, file);
    rejectText(text, /scaleupafrica/i, file);
  }

  const adminIndex = await fs.readFile(path.join(ADMIN_DIST, "index.html"), "utf8");
  requireText(adminIndex, "Cresciva", "admin/index.html");
}

async function verifyBudgets() {
  const publicAssets = path.join(DIST, "assets");
  const adminAssets = path.join(ADMIN_DIST, "assets");

  const publicJs = await collect(publicAssets, ".js");
  const adminJs = await collect(adminAssets, ".js");
  const publicCss = await collect(publicAssets, ".css");
  const adminCss = await collect(adminAssets, ".css");
  const cssTotal = publicCss.total + adminCss.total;

  const failures = [];
  if (publicJs.total > limits.publicJsTotalGzip) failures.push(`public JS gzip ${publicJs.total} > ${limits.publicJsTotalGzip}`);
  if (publicJs.largest > limits.publicLargestJsGzip) failures.push(`largest public JS gzip ${publicJs.largest} > ${limits.publicLargestJsGzip}`);
  if (adminJs.total > limits.adminJsTotalGzip) failures.push(`admin JS gzip ${adminJs.total} > ${limits.adminJsTotalGzip}`);
  if (cssTotal > limits.cssTotalGzip) failures.push(`combined CSS gzip ${cssTotal} > ${limits.cssTotalGzip}`);

  console.log(JSON.stringify({
    public_js_gzip: publicJs.total,
    public_largest_chunk_gzip: publicJs.largest,
    admin_js_gzip: adminJs.total,
    css_gzip: cssTotal,
    limits,
  }, null, 2));

  if (failures.length) throw new Error(`Web quality budgets failed:\n- ${failures.join("\n- ")}`);
}

await verifyMetadata();
await verifyBudgets();
console.log("web-quality: PASS");
