import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = rgba(x, y, size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function draw(x, y, size, { maskable }) {
  const pad = maskable ? size * 0.18 : size * 0.08;
  const inside = x >= pad && y >= pad && x < size - pad && y < size - pad;
  // Soft background
  if (!inside && maskable) return [245, 243, 248, 255];
  if (!inside) return [245, 243, 248, 255];

  const nx = (x - pad) / (size - pad * 2);
  const ny = (y - pad) / (size - pad * 2);

  // Card (tilted rectangle)
  const cx = nx - 0.5;
  const cy = ny - 0.48;
  const ang = -0.12;
  const rx = cx * Math.cos(ang) - cy * Math.sin(ang);
  const ry = cx * Math.sin(ang) + cy * Math.cos(ang);
  const card = Math.abs(rx) < 0.22 && ry > -0.32 && ry < 0.18;

  // Pocket body
  const inPocketX = nx > 0.16 && nx < 0.84;
  const pocketTop = 0.42;
  const pocketBottom = 0.86;
  const curve = Math.pow((nx - 0.5) / 0.34, 2);
  const pocket = inPocketX && ny > pocketTop && ny < pocketBottom - curve * 0.08 && ny < 0.88;

  if (pocket) return [124, 108, 191, 255];
  if (card) {
    if (ry < -0.22 && Math.abs(rx + 0.04) < 0.08) return [124, 108, 191, 255];
    if (ry < -0.14 && Math.abs(rx) < 0.14) return [207, 200, 220, 255];
    return [255, 255, 255, 255];
  }
  const bg = maskable ? [245, 243, 248, 255] : [245, 243, 248, 255];
  return bg;
}

const dir = path.resolve('public/icons');
fs.mkdirSync(dir, { recursive: true });

for (const [name, size, opts] of [
  ['icon-192.png', 192, { maskable: false }],
  ['icon-512.png', 512, { maskable: false }],
  ['icon-maskable-512.png', 512, { maskable: true }],
]) {
  fs.writeFileSync(path.join(dir, name), png(size, (x, y, s) => draw(x, y, s, opts)));
}

void lerp;
console.log('Wrote icons to', dir);
