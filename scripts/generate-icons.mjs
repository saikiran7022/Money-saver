// Generates the PWA / Apple-touch icons from scratch — no image libraries, no
// network. Each icon is a brand-coloured rounded square with a simple ascending
// bar-chart glyph (the app's "growing savings" mark) drawn in white.
//
// Pure Node: we hand-encode RGBA PNGs using the built-in zlib. Run via
// `npm run generate:icons`. Output lands in public/icons/ and is bundled into
// dist by Vite, so the app stays 100% self-hosted (no external icon CDN).
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

// Brand palette (matches tailwind.config.js): vertical gradient brand-600 → 400.
const TOP = [79, 70, 229]; // #4f46e5
const BOT = [129, 140, 248]; // #818cf8
const WHITE = [255, 255, 255];

function lerp(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

// --- minimal PNG encoder (RGBA, 8-bit) -------------------------------------
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  // 10-12 default (deflate / adaptive / no interlace)
  // Add a filter byte (0 = none) at the start of every row.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- drawing ---------------------------------------------------------------
// fullBleed: square background to the edges (Apple / maskable). Otherwise the
// corners are rounded and transparent (standard adaptive PWA icon).
function drawIcon(size, { fullBleed, safe }) {
  const buf = Buffer.alloc(size * size * 4); // transparent by default
  const radius = fullBleed ? 0 : size * 0.22;

  const set = (x, y, [r, g, b], a = 255) => {
    const i = (y * size + x) * 4;
    // simple alpha-over onto whatever is there (background already opaque)
    const ba = buf[i + 3];
    if (ba === 0 || a === 255) {
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = a;
    } else {
      const af = a / 255;
      buf[i] = Math.round(r * af + buf[i] * (1 - af));
      buf[i + 1] = Math.round(g * af + buf[i + 1] * (1 - af));
      buf[i + 2] = Math.round(b * af + buf[i + 2] * (1 - af));
      buf[i + 3] = 255;
    }
  };

  // Background (rounded rect, vertical gradient).
  const inCorner = (x, y) => {
    if (radius <= 0) return true;
    const cx = x < radius ? radius : x > size - radius ? size - radius : x;
    const cy = y < radius ? radius : y > size - radius ? size - radius : y;
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= radius * radius;
  };
  for (let y = 0; y < size; y++) {
    const col = lerp(TOP, BOT, y / (size - 1));
    for (let x = 0; x < size; x++) {
      if (inCorner(x, y)) set(x, y, col, 255);
    }
  }

  // Bar-chart glyph inside a centred content box. `safe` shrinks it (maskable
  // safe-zone). 3 ascending bars, rounded tops, bottom-aligned.
  const box = size * (safe ? 0.5 : 0.6);
  const ox = (size - box) / 2;
  const oy = (size - box) / 2;
  const gap = box * 0.12;
  const barW = (box - gap * 2) / 3;
  const heights = [0.5, 0.74, 1.0];
  for (let b = 0; b < 3; b++) {
    const bx = ox + b * (barW + gap);
    const bh = box * heights[b];
    const by = oy + (box - bh);
    const r = barW * 0.32; // rounded top corners
    for (let y = Math.floor(by); y < oy + box; y++) {
      for (let x = Math.floor(bx); x < bx + barW; x++) {
        // round only the two top corners
        let draw = true;
        if (y < by + r) {
          const cx = x < bx + r ? bx + r : x > bx + barW - r ? bx + barW - r : x;
          const cy = by + r;
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy > r * r) draw = false;
        }
        if (draw) set(x, y, WHITE, 245);
      }
    }
  }
  return buf;
}

const targets = [
  { name: 'icon-192.png', size: 192, fullBleed: false, safe: false },
  { name: 'icon-512.png', size: 512, fullBleed: false, safe: false },
  { name: 'icon-maskable-512.png', size: 512, fullBleed: true, safe: true },
  { name: 'apple-touch-icon.png', size: 180, fullBleed: true, safe: false },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const t of targets) {
  const rgba = drawIcon(t.size, { fullBleed: t.fullBleed, safe: t.safe });
  writeFileSync(join(OUT_DIR, t.name), encodePng(t.size, rgba));
  console.log(`wrote icons/${t.name} (${t.size}x${t.size})`);
}
