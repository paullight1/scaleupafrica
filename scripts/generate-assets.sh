#!/usr/bin/env bash
# Regenerate the branding raster assets in Frontend/public/ from the SVG sources in scripts/.
#
# This environment has no Playwright / sharp / rsvg / ImageMagick, so we use macOS
# `sips` (ImageIO) to rasterize SVG -> PNG, and a tiny Node wrapper to pack PNGs into
# a favicon.ico (PNG-in-ICO, accepted by all modern browsers).
#
# sips falls back to a system sans (Sora/Inter are not available to the rasterizer).
# For a Sora-accurate og-banner, render scripts/og-banner.html with Playwright:
#   npx playwright screenshot --viewport-size=1200,630 scripts/og-banner.html Frontend/public/og-banner.png
#
# Usage:  bash scripts/generate-assets.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "og-banner.png (1200x630)"
sips -s format png scripts/og-banner.svg --out Frontend/public/og-banner.png >/dev/null
# Shrink the 24-bit gradient PNG (~600KB) to a dithered 256-colour PNG (~110KB) if PIL is present.
python3 - <<'PY' || echo "  (PIL not found; keeping full-size PNG)"
from PIL import Image
im = Image.open('Frontend/public/og-banner.png').convert('RGB')
im.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG).save('Frontend/public/og-banner.png', optimize=True)
PY

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

echo "done."
