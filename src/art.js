import { SIZE, seeded } from './engine.js';
export { SpriteAtlas, DIRECTIONS } from './sprites.js';

export const TILE_W = 48, TILE_H = 24;
export const project = (x, y) => ({ x: (x - y) * 24, y: (x + y) * 12 });
export const unproject = (x, y) => ({ x: x / 48 + y / 24, y: y / 24 - x / 48 });
export function polygon(ctx, points, fill, stroke) {
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// Bake continuous ground cover and bathymetry once; mobile frames reuse the bitmap.
function naturalSurface(map, target, origin) {
  const depth = new Float32Array(SIZE * SIZE).fill(99), queue = [];
  for (let i = 0; i < depth.length; i++) if (map.tiles[i]) { depth[i] = 0; queue.push(i); }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head], x = i % SIZE, y = Math.floor(i / SIZE);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, n = ny * SIZE + nx;
      if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE && depth[n] > depth[i] + 1) { depth[n] = depth[i] + 1; queue.push(n); }
    }
  }
  const colors = new Float32Array(SIZE * SIZE * 3);
  for (let i = 0; i < depth.length; i++) {
    const x = i % SIZE, y = Math.floor(i / SIZE), type = map.tiles[i];
    const cover = Math.sin(x * .31 + Math.sin(y * .17) * 2) * .5 + Math.cos(y * .43 + x * .11) * .3;
    let rgb;
    if (!type) {
      const t = 1 - Math.exp(-depth[i] / 3.4);
      rgb = [66 - 45 * t, 133 - 73 * t, 126 - 48 * t];
    } else if (type === 2) rgb = [166 + cover * 13, 157 + cover * 12, 112 + cover * 10];
    else if (type === 3) rgb = [99 + cover * 10, 107 + cover * 10, 91 + cover * 9];
    else rgb = [86 + cover * 16, 111 + cover * 15, 67 + cover * 10];
    colors.set(rgb, i * 3);
  }
  const baked = canvas(target.width / 2, target.height / 2), ctx = baked.getContext('2d'), pixels = ctx.createImageData(baked.width, baked.height);
  let grain = 7814;
  for (let py = 0; py < baked.height; py++) for (let px = 0; px < baked.width; px++) {
    const world = unproject(px * 2 - origin.x, py * 2 - origin.y);
    if (world.x < -.5 || world.y < -.5 || world.x >= SIZE - .5 || world.y >= SIZE - .5) continue;
    const wx = Math.max(0, Math.min(SIZE - 1, world.x)), wy = Math.max(0, Math.min(SIZE - 1, world.y));
    const x = Math.floor(wx), y = Math.floor(wy), fx = wx - x, fy = wy - y;
    const a = (y * SIZE + x) * 3, b = (y * SIZE + Math.min(x + 1, SIZE - 1)) * 3;
    const d = (Math.min(y + 1, SIZE - 1) * SIZE + x) * 3, e = (Math.min(y + 1, SIZE - 1) * SIZE + Math.min(x + 1, SIZE - 1)) * 3;
    grain = (Math.imul(grain, 1664525) + 1013904223) | 0;
    const noise = ((grain >>> 24) / 255 - .5) * (map.tiles[Math.round(wy) * SIZE + Math.round(wx)] ? 12 : 3);
    const offset = (py * baked.width + px) * 4;
    for (let channel = 0; channel < 3; channel++) pixels.data[offset + channel] = (colors[a + channel] * (1 - fx) + colors[b + channel] * fx) * (1 - fy) + (colors[d + channel] * (1 - fx) + colors[e + channel] * fx) * fy + noise;
    pixels.data[offset + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const output = target.getContext('2d'); output.imageSmoothingEnabled = true; output.drawImage(baked, 0, 0, target.width, target.height);
}

export class TerrainArt {
  constructor(map) {
    this.map = map; this.canvas = canvas(3200, 1740); this.origin = { x: 1600, y: 80 }; this.decorations = [];
    this.draw();
  }
  draw() {
    naturalSurface(this.map, this.canvas, this.origin);
    const c = this.canvas.getContext('2d'); c.imageSmoothingEnabled = false;
    c.translate(this.origin.x, this.origin.y); const random = seeded(7814);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const { x: px, y: py } = project(x, y), tile = this.map.tiles[y * SIZE + x];
      for (let i = 0; i < (tile === 0 ? 5 : 18); i++) {
        const tx = (random() - .5) * 41, ty = (random() - .5) * 19;
        if (Math.abs(tx) / 24 + Math.abs(ty) / 12 > .9) continue;
        c.fillStyle = tile === 0 ? ['#69948a28', '#81b7a425', '#173e4b24'][i % 3] : tile === 2 ? ['#e3d39a50', '#7e88654a', '#c5c09180'][i % 3] : ['#a6aa6740', '#324f352c', '#87965680'][i % 3];
        c.fillRect(Math.round(px + tx), Math.round(py + ty), tile === 0 ? 3 + Math.floor(random() * 6) : 2, 1);
      }
      if (tile === 2) {
        for (const [dx, dy, a, b] of [[1, 0, [24, 0], [0, 12]], [0, 1, [0, 12], [-24, 0]], [-1, 0, [-24, 0], [0, -12]], [0, -1, [0, -12], [24, 0]]]) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE && this.map.tiles[ny * SIZE + nx] === 0) {
            // Broken surf and a damp sand band follow the actual landing beaches.
            c.beginPath(); c.strokeStyle = '#5a867b60'; c.lineWidth = 6; c.moveTo(px + a[0], py + a[1]); c.lineTo(px + b[0], py + b[1]); c.stroke();
            c.beginPath(); c.strokeStyle = '#e0ebd3a0'; c.lineWidth = 1.5;
            for (let n = 0; n <= 8; n++) { const t = n / 8, sx = px + a[0] * (1 - t) + b[0] * t, sy = py + a[1] * (1 - t) + b[1] * t + Math.sin(t * Math.PI * 3) * 1.4; if (n === 0 || n === 5) c.moveTo(sx, sy); else c.lineTo(sx, sy); }
            c.stroke(); c.lineWidth = 1;
          }
        }
      }
      if (tile === 3) {
        c.fillStyle = '#19372b55'; c.beginPath(); c.ellipse(px + 9, py + 8, 23, 8, .15, 0, Math.PI * 2); c.fill();
        const a = [[px - 19, py + 1], [px - 11, py - 10], [px + 6, py - 14], [px + 21, py - 2], [px + 13, py + 9], [px - 7, py + 11]];
        polygon(c, a, '#7d8570', '#586752'); polygon(c, [[px + 6, py - 14], [px + 21, py - 2], [px + 13, py + 9], [px - 2, py + 3]], '#526554');
        polygon(c, [[px - 19, py + 1], [px - 11, py - 10], [px + 6, py - 14], [px - 2, py + 3]], '#92987c');
      }
      if (tile === 1 && !this.map.oreMax[y * SIZE + x] && (x < 7 || x > 58 || y < 3 || y > 60) && random() > .58) this.decorations.push({ x, y, type: random() > .3 ? 'tree' : 'rock', seed: random() });
    }
  }
}
