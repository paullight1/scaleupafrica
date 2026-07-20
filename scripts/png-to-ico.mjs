// Pack one or more PNG files into a single .ico (PNG-in-ICO / "Vista" format).
// All modern browsers accept PNG-compressed ICO entries.
//   node scripts/png-to-ico.mjs <out.ico> <in1.png> [in2.png ...]
import { readFileSync, writeFileSync } from "node:fs";

const [, , outPath, ...pngPaths] = process.argv;
if (!outPath || pngPaths.length === 0) {
  console.error("usage: node png-to-ico.mjs <out.ico> <png...>");
  process.exit(1);
}

const pngs = pngPaths.map((p) => {
  const buf = readFileSync(p);
  // PNG dimensions live at bytes 16-24 (IHDR width/height, big-endian).
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { buf, width, height };
});

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: 1 = icon
header.writeUInt16LE(pngs.length, 4); // image count

const entrySize = 16;
let offset = 6 + entrySize * pngs.length;
const entries = [];
for (const { buf, width, height } of pngs) {
  const e = Buffer.alloc(entrySize);
  e.writeUInt8(width >= 256 ? 0 : width, 0);
  e.writeUInt8(height >= 256 ? 0 : height, 1);
  e.writeUInt8(0, 2); // palette count
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // color planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(buf.length, 8); // size of image data
  e.writeUInt32LE(offset, 12); // offset of image data
  offset += buf.length;
  entries.push(e);
}

writeFileSync(outPath, Buffer.concat([header, ...entries, ...pngs.map((p) => p.buf)]));
console.log(`wrote ${outPath} (${pngs.length} sizes)`);
