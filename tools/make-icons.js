// Генерация PNG-иконок без зависимостей: node tools/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePNG(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const C1 = hex('#4F46E5');
const C2 = hex('#B455F2');
const LIT = new Set([0, 4, 5, 7]); // «загоревшиеся» клетки, как в игре «Матрица»

function inRoundRect(x, y, cx, cy, half, r) {
  const ax = Math.max(Math.abs(x - cx) - (half - r), 0);
  const ay = Math.max(Math.abs(y - cy) - (half - r), 0);
  return ax * ax + ay * ay <= r * r;
}

function render(S) {
  const buf = Buffer.alloc(S * S * 4);
  const grid = 0.56 * S, gap = 0.055 * S;
  const tile = (grid - gap * 2) / 3, r = tile * 0.26, x0 = (S - grid) / 2;
  const tiles = [];
  for (let i = 0; i < 9; i++) {
    tiles.push({
      cx: x0 + (i % 3) * (tile + gap) + tile / 2,
      cy: x0 + Math.floor(i / 3) * (tile + gap) + tile / 2,
      a: LIT.has(i) ? 1 : 0.2,
    });
  }
  const SS = 4;
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      let R = 0, G = 0, B = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS, y = py + (sy + 0.5) / SS;
          const t = (x * 0.6 + y) / (1.6 * S);
          let c = [0, 1, 2].map((k) => C1[k] + (C2[k] - C1[k]) * t);
          const hl = Math.max(0, 1 - Math.hypot(x - S * 0.25, y - S * 0.1) / (S * 0.75)) * 0.16;
          c = c.map((v) => v + (255 - v) * hl);
          for (const tl of tiles) {
            if (inRoundRect(x, y, tl.cx, tl.cy, tile / 2, r)) {
              c = c.map((v) => v + (255 - v) * tl.a);
              break;
            }
          }
          R += c[0]; G += c[1]; B += c[2];
        }
      }
      const k = SS * SS, o = (py * S + px) * 4;
      buf[o] = Math.min(255, Math.round(R / k));
      buf[o + 1] = Math.min(255, Math.round(G / k));
      buf[o + 2] = Math.min(255, Math.round(B / k));
      buf[o + 3] = 255;
    }
  }
  return encodePNG(S, S, buf);
}

const out = path.join(__dirname, '..', 'icons');
for (const size of [180, 192, 512]) {
  fs.writeFileSync(path.join(out, `icon-${size}.png`), render(size));
  console.log(`icons/icon-${size}.png`);
}
