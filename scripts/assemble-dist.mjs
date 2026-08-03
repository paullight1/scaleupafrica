#!/usr/bin/env node
/**
 * Folds AdminPanel/dist into Frontend/dist/admin so the two apps ship as one
 * deployable directory.
 *
 * The panel is built with `base: "/admin/"` (AdminPanel/vite.config.ts), so its
 * asset URLs already assume this location — copying it anywhere else produces a
 * page that loads and then 404s every script tag.
 *
 * Frontend/dist is the deploy root (see vercel.json#outputDirectory).
 */

import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FRONTEND_DIST = resolve(ROOT, "Frontend/dist");
const ADMIN_DIST = resolve(ROOT, "AdminPanel/dist");
const TARGET = resolve(FRONTEND_DIST, "admin");

// Unlike the sitemap step, this one is fatal: a deploy missing /admin is a
// broken deploy, not a degraded one, and it must not reach production quietly.
for (const [label, path] of [
  ["Frontend/dist", FRONTEND_DIST],
  ["AdminPanel/dist", ADMIN_DIST],
]) {
  if (!existsSync(path)) {
    console.error(`assemble: ${label} is missing — run the workspace builds first`);
    process.exit(1);
  }
}

// Clear first so a file deleted from the panel doesn't survive in the output.
rmSync(TARGET, { recursive: true, force: true });
cpSync(ADMIN_DIST, TARGET, { recursive: true });

console.log(`assemble: AdminPanel/dist → Frontend/dist/admin`);
