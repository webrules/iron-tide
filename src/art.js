import { SIZE, seeded, coast } from './engine.js';
export { SpriteAtlas, DIRECTIONS } from './sprites.js';

export const TILE_W = 48, TILE_H = 24;
export const project = (x, y) => ({ x: (x - y) * 24, y: (x + y) * 12 });
export const unproject = (x, y) => ({ x: x / 48 + y / 24, y: y / 24 - x / 48 });
export function polygon(ctx, points, fill, stroke) {
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export class TerrainArt {
  constructor(map) {
    this.map = map; this.canvas = canvas(3200, 1740); this.origin = { x: 1600, y: 80 }; this.decorations = [];
    this.draw();
  }
  draw() {
    const c = this.canvas.getContext('2d'); c.imageSmoothingEnabled = false;
    c.translate(this.origin.x, this.origin.y); const random = seeded(7814);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const { x: px, y: py } = project(x, y), tile = this.map.tiles[y * SIZE + x];
      let color;
      if (tile === 0) {
        const shoreDistance = Math.min(Math.abs(y - coast(x, 1)), Math.abs(y - coast(x, 0)), Math.max(0, Math.hypot((x - 32), (y - 32)) - 6));
        color = shoreDistance < 3 ? ['#477e7b', '#427979', '#4b8180'][Math.floor(random() * 3)] : ['#28535c', '#2a565e', '#2d5860', '#2b555e'][Math.floor(random() * 4)];
      } else if (tile === 2) color = ['#b1ac7f', '#b7af81', '#aba77b', '#b8b087'][Math.floor(random() * 4)];
      else if (tile === 3) color = ['#747963', '#7f836b', '#737967'][Math.floor(random() * 3)];
      else color = ['#657b54', '#677c55', '#697e57', '#627750', '#6a7c55'][Math.floor(random() * 5)];
      polygon(c, [[px, py - 12], [px + 24, py], [px, py + 12], [px - 24, py]], color);
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
            c.beginPath(); c.strokeStyle = '#d2dcc0a0'; c.lineWidth = 2; c.moveTo(px + a[0], py + a[1]); c.lineTo(px + b[0], py + b[1]); c.stroke(); c.lineWidth = 1;
          }
        }
      }
      if (tile === 3) {
        const a = [[px - 19, py + 1], [px - 11, py - 10], [px + 6, py - 14], [px + 21, py - 2], [px + 13, py + 9], [px - 7, py + 11]];
        polygon(c, a, '#7d8570', '#586752'); polygon(c, [[px + 6, py - 14], [px + 21, py - 2], [px + 13, py + 9], [px - 2, py + 3]], '#526554');
        polygon(c, [[px - 19, py + 1], [px - 11, py - 10], [px + 6, py - 14], [px - 2, py + 3]], '#92987c');
      }
      if (tile === 1 && !this.map.oreMax[y * SIZE + x] && (x < 7 || x > 58 || y < 3 || y > 60) && random() > .58) this.decorations.push({ x, y, type: random() > .3 ? 'tree' : 'rock', seed: random() });
    }
    // Faint topographic grid on the water; no borders over the land.
    for (let y = 22; y < 44; y += 4) for (let x = 4; x < 60; x += 4) if (!this.map.tiles[y * SIZE + x]) {
      const p = project(x, y); c.strokeStyle = '#b4d1ad16'; c.beginPath(); c.moveTo(p.x - 4, p.y - 2); c.lineTo(p.x + 4, p.y + 2); c.moveTo(p.x - 4, p.y + 2); c.lineTo(p.x + 4, p.y - 2); c.stroke();
    }
  }
}
