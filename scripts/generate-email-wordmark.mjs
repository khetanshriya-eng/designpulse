/**
 * Generates public/email/wordmark.png — the digest header wordmark as a
 * pixel-art PNG ("designator ✦", cream letterforms + lime star, transparent
 * background). Shipped as an IMAGE because it's the only way brand-exact
 * colors survive Gmail's dark-mode transform (verified 2026-07: Gmail never
 * repaints large images; small ones CAN be negative-inverted, hence the
 * ≥54px declared height in the template).
 *
 * Hand-encoded PNG (zlib is built into node) so there are no dependencies.
 * 2x export: file is 576×112, displayed at 288×56 (integer halving = crisp).
 *
 * Run: node scripts/generate-email-wordmark.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const CREAM = [0xff, 0xfa, 0xf0, 255];
const LIME = [0xd4, 0xff, 0x3f, 255];
const CLEAR = [0, 0, 0, 0];

// 5×7 pixel glyphs, chunky lowercase — matches the site's pixel-face vibe.
const GLYPHS = {
  d: ["....X", "....X", ".XXXX", "X...X", "X...X", "X...X", ".XXXX"],
  e: [".....", ".....", ".XXX.", "X...X", "XXXXX", "X....", ".XXXX"],
  s: [".....", ".....", ".XXXX", "X....", ".XXX.", "....X", "XXXX."],
  i: ["..X..", ".....", "..X..", "..X..", "..X..", "..X..", "..X.."],
  // g gets a real descender (rows 8-9) — without it it read like an s.
  g: [".....", ".....", ".XXX.", "X...X", "X...X", ".XXXX", "....X", ".XXX."],
  n: [".....", ".....", "XXXX.", "X...X", "X...X", "X...X", "X...X"],
  a: [".....", ".....", ".XXX.", "....X", ".XXXX", "X...X", ".XXXX"],
  t: ["..X..", "..X..", "XXXXX", "..X..", "..X..", "..X..", "..XX."],
  o: [".....", ".....", ".XXX.", "X...X", "X...X", "X...X", ".XXX."],
  r: [".....", ".....", "X.XX.", "XX..X", "X....", "X....", "X...."],
};
// 7×7 four-pointed star ✦
const STAR = ["...X...", "...X...", "..XXX..", "XXXXXXX", "..XXX..", "...X...", "...X..."];

// ── Compose the pixel grid ──
const WORD = "designator";
const GLYPH_W = 5, GLYPH_H = 7, GAP = 1, STAR_W = 7, WORD_STAR_GAP = 3, PAD_X = 2;
const cols = PAD_X + WORD.length * (GLYPH_W + GAP) - GAP + WORD_STAR_GAP + STAR_W + PAD_X;
const rows = 14; // 7 glyph rows vertically centered → 2x export halves to 56px
const TOP = Math.floor((rows - GLYPH_H) / 2);

const grid = Array.from({ length: rows }, () => Array(cols).fill(0)); // 0 clear, 1 cream, 2 lime
let x = PAD_X;
for (const ch of WORD) {
  const g = GLYPHS[ch];
  for (let r = 0; r < g.length; r++)
    for (let c = 0; c < GLYPH_W; c++)
      if (g[r][c] === "X") grid[TOP + r][x + c] = 1;
  x += GLYPH_W + GAP;
}
x += WORD_STAR_GAP - GAP;
for (let r = 0; r < 7; r++)
  for (let c = 0; c < STAR_W; c++)
    if (STAR[r][c] === "X") grid[TOP + r][x + c] = 2;

// ── Rasterize at SCALE and encode as PNG ──
const SCALE = 8;
const W = cols * SCALE, H = rows * SCALE;
const raw = Buffer.alloc(H * (1 + W * 4)); // filter byte + RGBA per row
for (let py = 0; py < H; py++) {
  const rowStart = py * (1 + W * 4);
  raw[rowStart] = 0; // filter: none
  for (let px = 0; px < W; px++) {
    const v = grid[Math.floor(py / SCALE)][Math.floor(px / SCALE)];
    const rgba = v === 1 ? CREAM : v === 2 ? LIME : CLEAR;
    rgba.forEach((b, i) => (raw[rowStart + 1 + px * 4 + i] = b));
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

mkdirSync(new URL("../public/email/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/email/wordmark.png", import.meta.url), png);
console.log(`wordmark.png: ${W}×${H} (display ${W / 2}×${H / 2}), ${png.length} bytes`);
