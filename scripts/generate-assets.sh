#!/usr/bin/env bash
# Regenerate the branding raster assets in Frontend/public/ from the SVG sources in scripts/.
#
# This environment has no Playwright / sharp / rsvg / ImageMagick, so we use macOS
# `sips` (ImageIO) to rasterize SVG -> PNG, and a tiny Node wrapper to pack PNGs into
# a favicon.ico (PNG-in-ICO, accepted by all modern browsers).
#
# The icon sources are pure geometry (no <text>), so `sips` having no access to
# Sora/Inter no longer matters -- what it rasterizes is what browsers draw.
#
# NOT handled here: og-banner.png. That is a screenshot of the live landing hero,
# taken by `npm run og` (scripts/generate-og-screenshot.mjs). Do not regenerate it
# from an SVG -- the hand-drawn card silently drifted from the real page.
#
# Usage:  bash scripts/generate-assets.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "favicon.svg (copy source)"
cp scripts/favicon.svg Frontend/public/favicon.svg

echo "apple-touch-icon.png (180x180)"
sips -s format png scripts/apple-touch-icon.svg --out Frontend/public/apple-touch-icon.png >/dev/null

echo "icon-192.png / icon-512.png"
sips -s format png scripts/favicon.svg --resampleHeightWidth 192 192 --out Frontend/public/icon-192.png >/dev/null
sips -s format png scripts/favicon.svg --resampleHeightWidth 512 512 --out Frontend/public/icon-512.png >/dev/null

echo "favicon.ico (32 + 48, PNG-in-ICO)"
sips -s format png scripts/favicon.svg --resampleHeightWidth 32 32 --out /tmp/_fav32.png >/dev/null
sips -s format png scripts/favicon.svg --resampleHeightWidth 48 48 --out /tmp/_fav48.png >/dev/null
node scripts/png-to-ico.mjs Frontend/public/favicon.ico /tmp/_fav32.png /tmp/_fav48.png
rm -f /tmp/_fav32.png /tmp/_fav48.png

echo "admin panel favicons"
cp Frontend/public/favicon.svg AdminPanel/public/favicon.svg
cp Frontend/public/favicon.ico AdminPanel/public/favicon.ico

echo "done.  (og-banner.png is separate: npm run og)"
