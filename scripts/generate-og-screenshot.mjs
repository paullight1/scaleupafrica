#!/usr/bin/env node
/**
 * Regenerates Frontend/public/og-banner.png — the image every link preview
 * shows — as a real screenshot of the live landing hero.
 *
 * Why a screenshot rather than a designed card: the banner then can never drift
 * from the actual product. The old scripts/og-banner.svg had to be redrawn by
 * hand every time the headline changed, and silently didn't get redrawn.
 *
 * How the size works: the page is rendered in a 1440x756 viewport (wide enough
 * that both hero CTAs fit) and rasterized at a 0.8333 device-scale factor, which
 * lands on exactly 1200x630 — the OG spec's 1.91:1 — with no resampling step,
 * so this needs no `sips`/`sharp`/ImageMagick.
 *
 * Usage:  npm run og            (starts the dev server itself)
 *         npm run og -- <url>   (screenshot an already-running server)
 */

import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "Frontend/public/og-banner.png");

const VIEWPORT = { width: 1440, height: 756 };
const TARGET = { width: 1200, height: 630 };
const SCALE = TARGET.width / VIEWPORT.width; // 0.8333… → exactly 1200x630
const DEV_URL = "http://localhost:8080/";
const READY_TIMEOUT_MS = 90_000;

/** Chrome ships under different names per platform; take the first that exists. */
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      "no Chrome/Chromium found. Install Google Chrome, or set CHROME_PATH to a binary.",
    );
  }
  return found;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  throw new Error(`${url} did not respond within ${timeoutMs / 1000}s`);
}

function run(cmd, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", rejectRun);
    child.on("close", (code) =>
      // Chrome logs benign warnings to stderr even on success, so trust the exit
      // code and only surface stderr when it actually failed.
      code === 0 ? resolveRun() : rejectRun(new Error(`exit ${code}\n${stderr.trim()}`)),
    );
  });
}

async function main() {
  const urlArg = process.argv[2];
  const url = urlArg || DEV_URL;
  const chrome = findChrome();

  let server;
  if (!urlArg) {
    console.log("og: starting the dev server…");
    server = spawn("npm", ["run", "dev"], { cwd: ROOT, stdio: "ignore", detached: true });
  }

  try {
    await waitForServer(url, READY_TIMEOUT_MS);
    console.log(`og: capturing ${url} at ${VIEWPORT.width}x${VIEWPORT.height} → ${TARGET.width}x${TARGET.height}`);

    await run(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--force-device-scale-factor=${SCALE}`,
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      // Long enough for fonts, the illustration and the reveal animations to settle.
      "--virtual-time-budget=8000",
      `--screenshot=${OUT}`,
      url,
    ]);
  } finally {
    // The dev server is detached so it owns a process group; kill the group or
    // the esbuild/vite children outlive this script and hold port 8080.
    if (server?.pid) {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {
        // already gone
      }
    }
  }

  if (!existsSync(OUT)) throw new Error("Chrome reported success but wrote no file");
  console.log(`og: ${(statSync(OUT).size / 1024).toFixed(0)} KB → ${OUT}`);
}

main().catch((error) => {
  console.error(`og: failed — ${error.message}`);
  process.exit(1);
});
