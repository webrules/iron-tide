import { TYPES, SIZE, distance, footprint, clamp } from './engine.js';
import { SpriteAtlas, TerrainArt, project, unproject, polygon, DIRECTIONS } from './art.js';

export class Renderer {
  constructor(canvas, minimap, game) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.mini = minimap; this.game = game;
    this.atlas = new SpriteAtlas(); this.terrain = new TerrainArt(game.map);
    this.unitMaterials = new Image(); this.unitMaterials.src = new URL('../assets/unit-materials.png', import.meta.url).href;
    this.camera = { x: 0, y: 770, zoom: .9 }; this.width = 1000; this.height = 800;
    this.selected = new Set(); this.hover = null; this.mouse = { x: 0, y: 0 }; this.placement = null; this.selectionBox = null; this.marker = null;
    this.resize();
  }
  resize() {
    const bounds = this.canvas.getBoundingClientRect(); this.width = bounds.width; this.height = bounds.height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2); this.canvas.width = Math.round(bounds.width * this.dpr); this.canvas.height = Math.round(bounds.height * this.dpr);
    this.ctx.imageSmoothingEnabled = false;
  }
  toScreen(x, y) { const p = project(x, y); return { x: (p.x - this.camera.x) * this.camera.zoom + this.width / 2, y: (p.y - this.camera.y) * this.camera.zoom + this.height / 2 }; }
  toWorld(x, y) { return unproject((x - this.width / 2) / this.camera.zoom + this.camera.x, (y - this.height / 2) / this.camera.zoom + this.camera.y); }
  center(x, y) { const p = project(x, y); this.camera.x = p.x; this.camera.y = p.y; }
  pan(dx, dy) { this.camera.x = clamp(this.camera.x + dx / this.camera.zoom, -1560, 1560); this.camera.y = clamp(this.camera.y + dy / this.camera.zoom, 0, 1600); }
  zoomAt(amount, x, y) {
    const before = this.toWorld(x, y); this.camera.zoom = clamp(this.camera.zoom * amount, .38, 1.9); const after = this.toWorld(x, y);
    const a = project(before.x, before.y), b = project(after.x, after.y); this.camera.x += a.x - b.x; this.camera.y += a.y - b.y;
  }
  spriteFor(e,time=this.game.time) {
    const d=TYPES[e.type],heading=angle=>((Math.round(angle/(Math.PI*2/DIRECTIONS))%DIRECTIONS)+DIRECTIONS)%DIRECTIONS;
    const body=heading(e.angle),aim=heading(e.turretAngle);
    const frame=Math.floor(time*(e.moving?6:d.kind==='building'?2:1))%4;
    const animate=e.moving||d.kind==='building'||d.domain==='water';
    // The turret turns independently. Firing no longer rotates the whole hull.
    const aiming=e.order?.type==='attack'||e.firingUntil>time||d.kind==='building';
    return this.atlas.get(e.type,e.team,animate?frame:0,body,aiming?aim:body);
  }
  hit(x, y) {
    const world = this.toWorld(x, y);
    const items = this.game.entities.filter(e => this.game.visible(e, 0)).sort((a, b) => b.x + b.y - a.x - a.y);
    for (const e of items) {
      const p = this.toScreen(e.x, e.y), d = TYPES[e.type], z = this.camera.zoom;
      if (d.kind === 'building') {
        if (Math.abs(world.x - e.x) <= d.size / 2 + .25 && Math.abs(world.y - e.y) <= d.size / 2 + .25) return e;
      }
      if (Math.abs(x - p.x) < 128 * z && y > p.y - 168 * z && y < p.y + 56 * z) {
        const bob = d.domain === 'water' ? Math.round(Math.sin(this.game.time * 1.7 + e.id) * 1.3) : 0;
        const sprite = this.spriteFor(e);
        if (this.atlas.opaque(sprite, (x - p.x) / z + 128, (y - p.y) / z - bob + 168)) return e;
      }
    }
    return null;
  }
  visibleScreen(x, y, margin = 180) { const p = this.toScreen(x, y); return p.x > -margin && p.y > -margin && p.x < this.width + margin && p.y < this.height + margin; }
  diamond(x, y, size, fill, stroke) {
    const low = Math.floor(size / 2), a = project(x - low - .5, y - low - .5), b = project(x - low + size - .5, y - low - .5), c = project(x - low + size - .5, y - low + size - .5), d = project(x - low - .5, y - low + size - .5);
    polygon(this.ctx, [[a.x, a.y], [b.x, b.y], [c.x, c.y], [d.x, d.y]], fill, stroke);
  }
  render(now) {
    const c = this.ctx, g = this.game, z = this.camera.zoom;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.fillStyle = '#18383e'; c.fillRect(0, 0, this.width, this.height);
    c.save(); c.translate(this.width / 2, this.height / 2); c.scale(z, z); c.translate(-this.camera.x, -this.camera.y); c.imageSmoothingEnabled = false;
    c.imageSmoothingEnabled = true;
    c.drawImage(this.terrain.canvas, -this.terrain.origin.x, -this.terrain.origin.y);
    c.imageSmoothingEnabled = false;
    const time = g.time;
    // Moving foam lines and reflected light over the ocean.
    for (let y = 19; y < 48; y += 2) for (let x = 1; x < SIZE - 1; x += 3) {
      if (g.map.tiles[y * SIZE + x] || !this.visibleScreen(x, y, 20)) continue;
      const p = project(x, y), phase = time * .7 + x * .8 + y * .4, alpha = .055 + Math.max(0, Math.sin(phase)) * .08;
      const wx = p.x + Math.sin(phase) * 5, wy = p.y + Math.cos(phase) * 2;
      c.strokeStyle = `rgba(175,213,207,${alpha})`; c.lineWidth = 1;
      c.beginPath(); c.moveTo(wx - 8, wy); c.quadraticCurveTo(wx, wy - 3, wx + 9 + x % 5, wy + 1); c.stroke();
    }
    // Ore is drawn from current quantities, so mined fields visibly thin out.
    for (let i = 0; i < g.map.ore.length; i++) {
      if (!g.map.oreMax[i]) continue;
      const x = i % SIZE, y = Math.floor(i / SIZE); if (!this.visibleScreen(x, y, 30)) continue;
      const p = project(x, y), fill = g.map.ore[i] / g.map.oreMax[i];
      for (let n = 0; n < Math.ceil(fill * 7); n++) {
        const dx = ((i * 7 + n * 13) % 29) - 14, dy = ((i * 3 + n * 7) % 11) - 5;
        polygon(c, [[p.x + dx - 3, p.y + dy], [p.x + dx, p.y + dy - 5], [p.x + dx + 4, p.y + dy - 1], [p.x + dx + 2, p.y + dy + 2]], n % 2 ? '#cba44d' : '#e1c168', '#7f7e48');
        c.fillStyle = '#f4d889'; c.fillRect(p.x + dx, p.y + dy - 4, 2, 2);
      }
    }
    this.labels();
    for (const id of this.selected) {
      const e = g.get(id); if (!e || e.embarked) continue; const p = project(e.x, e.y), d = TYPES[e.type];
      if (d.range && this.selected.size === 1) {
        c.save(); c.translate(p.x, p.y); c.scale(2, 1); c.strokeStyle = '#d6d5a138'; c.lineWidth = .6; c.setLineDash([4, 6]); c.beginPath(); c.arc(0, 0, d.range * 17, 0, Math.PI * 2); c.stroke(); c.restore();
      }
      if (e.order && ['move', 'attackMove', 'attack', 'board'].includes(e.order.type)) {
        const goal = e.order.targetId ? g.get(e.order.targetId) : e.order;
        if (goal && !goal.embarked && g.visible(goal.id ? goal : { hp: 1, type: 'tank', team: 0 }, 0)) {
          const dest = project(goal.x, goal.y); c.strokeStyle = e.order.type === 'attack' ? '#f5916b80' : '#cddd9c60'; c.setLineDash([5, 7]); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(dest.x, dest.y); c.stroke(); c.setLineDash([]);
        }
      }
    }
    const objects = [...g.entities.filter(e => g.visible(e, 0)), ...this.terrain.decorations.map(e => ({ ...e, decor: true }))];
    objects.sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const e of objects) { if (!this.visibleScreen(e.x, e.y)) continue; if (e.decor) this.decoration(e); else this.entity(e, time); }
    for (const p of g.projectiles) {
      const ratio = 1 - p.life / p.total, x = p.fromX + (p.toX - p.fromX) * ratio, y = p.fromY + (p.toY - p.fromY) * ratio;
      const pos = project(x, y), last = project(x - (p.toX - p.fromX) * .05, y - (p.toY - p.fromY) * .05);
      if (p.weapon === 'torpedo') { c.strokeStyle = '#bed5bb99'; c.lineWidth = 2; c.beginPath(); c.moveTo(last.x, last.y); c.lineTo(pos.x, pos.y); c.stroke(); c.lineWidth = 1; c.fillStyle = '#b3ccb8'; c.fillRect(pos.x, pos.y, 3, 2); }
      else { const arc = p.weapon === 'shell' ? Math.sin(ratio * Math.PI) * 65 : 8; c.strokeStyle = '#efc47688'; c.lineWidth = 2; c.beginPath(); c.moveTo(last.x, last.y - arc - 8); c.lineTo(pos.x, pos.y - arc - 8); c.stroke(); c.lineWidth = 1; c.fillStyle = '#ffe5a1'; c.fillRect(pos.x - 2, pos.y - arc - 10, 4, 3); }
    }
    for (const f of g.effects) {
      const p = project(f.x, f.y), ratio = 1 - f.life / f.total;
      if (f.type === 'income') { c.globalAlpha = Math.min(1, f.life); c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillStyle = '#e9d88c'; c.fillText(`+${f.amount}`, p.x, p.y - 35 - ratio * 30); c.globalAlpha = 1; }
      else {
        const size = (f.size || 1) * 18;
        for (let n = 0; n < 10; n++) { const a = n * 2.4, spread = ratio * size * 1.3, r = Math.max(2, (1 - ratio) * size * (.3 + n % 3 * .15)); c.globalAlpha = 1 - ratio; c.fillStyle = ratio < .4 ? ['#ffe49c', '#efa653', '#cf663b'][n % 3] : ['#696e59', '#414f43', '#263c32'][n % 3]; c.fillRect(Math.round(p.x + Math.cos(a) * spread - r / 2), Math.round(p.y + Math.sin(a) * spread * .5 - ratio * 25 - r), r, r); }
        c.globalAlpha = 1;
      }
    }
    if (this.placement) this.drawPlacement();
    if (this.marker && now < this.marker.until) {
      const p = project(this.marker.x, this.marker.y), s = (this.marker.until - now) / 800;
      c.strokeStyle = this.marker.attack ? '#ff9075' : '#d9e9ab'; c.lineWidth = 2; c.beginPath(); c.ellipse(p.x, p.y, 8 + s * 18, 4 + s * 9, 0, 0, Math.PI * 2); c.stroke(); c.lineWidth = 1;
    }
    c.restore();
    // Soft edge shading keeps the UI readable without dimming the battlefield.
    const gradient = c.createLinearGradient(0, 0, 0, this.height); gradient.addColorStop(0, '#06151130'); gradient.addColorStop(.15, '#06151100'); gradient.addColorStop(.7, '#06151100'); gradient.addColorStop(1, '#06151144'); c.fillStyle = gradient; c.fillRect(0, 0, this.width, this.height);
    if (this.selectionBox) { const b = this.selectionBox; c.fillStyle = '#cee1a41a'; c.strokeStyle = '#d8e6aa'; c.lineWidth = 1; c.fillRect(b.x, b.y, b.w, b.h); c.strokeRect(b.x + .5, b.y + .5, b.w, b.h); }
    if (this.hover && !this.placement) this.tooltip(this.hover);
    if (Math.floor(now / 140) !== this.lastMiniFrame) { this.drawMinimap(); this.lastMiniFrame = Math.floor(now / 140); }
  }
  labels() {
    const c = this.ctx;
    for (const [x, y, title, subtitle] of [[24, 59, 'SOVIET COAST', 'SOUTHERN SECTOR'], [40, 3, 'ALLIED TERRITORY', 'NORTHERN SECTOR'], [32, 39, 'KREST ISLAND', 'NEUTRAL ORE RESERVE'], [15, 32, 'COLDWATER STRAIT', 'DEEP WATER']]) {
      if (!this.visibleScreen(x, y)) continue;
      const p = project(x, y); c.save(); c.translate(p.x, p.y); c.textAlign = 'center'; c.font = 'bold 10px monospace'; c.fillStyle = '#d6dcac72'; c.fillText(title, 0, 0); c.font = '7px monospace'; c.fillStyle = '#c6d5b44d'; c.fillText(subtitle, 0, 12); c.restore();
    }
  }
  decoration(e) {
    const c = this.ctx, p = project(e.x, e.y);
    c.save(); c.translate(p.x, p.y); const scale = .75 + e.seed * .55; c.scale(scale, scale); c.translate(-p.x, -p.y);
    if (e.type === 'tree') {
      c.fillStyle = '#172f2566'; c.beginPath(); c.ellipse(p.x + 5, p.y + 2, 15, 5, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#4a5238'; c.fillRect(p.x - 2, p.y - 18, 3, 19);
      for (let i = 0; i < 3; i++) polygon(c, [[p.x, p.y - 39 + i * 8], [p.x - 10 - i * 2, p.y - 20 + i * 7], [p.x + 11 + i * 2, p.y - 20 + i * 7]], ['#334f36', '#3b5a3b', '#496645'][i], '#294733');
    } else polygon(c, [[p.x - 9, p.y], [p.x - 4, p.y - 9], [p.x + 5, p.y - 7], [p.x + 11, p.y + 1], [p.x, p.y + 4]], '#8c9476', '#58694c');
    c.restore();
  }
  entity(e, time) {
    const c = this.ctx, p = project(e.x, e.y), d = TYPES[e.type], selected = this.selected.has(e.id), hovered = this.hover?.id === e.id;
    if (selected || hovered) {
      const color = e.team === 0 ? '#dcebb0' : '#fa947b';
      if (d.kind === 'building') this.diamond(Math.round(e.x), Math.round(e.y), d.size, '#d7eeb410', color);
      else { c.strokeStyle = color; c.beginPath(); c.ellipse(p.x, p.y + 3, d.domain === 'water' ? 38 : e.type === 'infantry' ? 12 : 27, d.domain === 'water' ? 13 : 9, 0, 0, Math.PI * 2); c.stroke(); }
    }
    if (e.moving && d.domain === 'water') {
      const vx = Math.cos(e.angle) - Math.sin(e.angle), vy = (Math.cos(e.angle) + Math.sin(e.angle)) / 2;
      for (let n = 1; n <= 3; n++) { c.strokeStyle = `rgba(163,209,189,${.25 - n * .05})`; c.beginPath(); c.ellipse(p.x - vx * (20 + n * 7), p.y - vy * (20 + n * 7), 4 + n * 3, 2 + n * 1.5, 0, 0, Math.PI * 2); c.stroke(); }
    }
    const sprite = this.spriteFor(e,time);
    if (e.type === 'sub') c.globalAlpha = e.team === 0 && e.revealedUntil < time ? .67 : .9;
    const bob = d.domain === 'water' ? Math.round(Math.sin(time * 1.7 + e.id) * 1.3) : 0;
    const sx = d.domain === 'water' ? 1024 : e.team === 0 ? 0 : 512;
    c.drawImage(sprite, Math.round(p.x) - 128, Math.round(p.y) - 168 + bob, 256, 224);
    if (this.unitMaterials.complete && this.unitMaterials.naturalWidth) {
      c.save(); c.globalAlpha = .18; c.globalCompositeOperation = 'soft-light'; c.drawImage(this.unitMaterials, sx, d.domain === 'water' ? 512 : 0, 512, 512, Math.round(p.x) - 128, Math.round(p.y) - 168 + bob, 256, 224); c.restore();
    }
    c.globalAlpha = 1;
    if (e.mining) { c.fillStyle = time % .3 < .15 ? '#edcb75' : '#a78a45'; c.fillRect(p.x + 14, p.y - 16, 4, 3); }
    if (e.firingUntil > time) { const q = project(Math.cos(e.turretAngle) * 1.25, Math.sin(e.turretAngle) * 1.25); c.fillStyle = '#ffdf9a'; c.fillRect(p.x + q.x - 5, p.y + q.y - 24, 9, 6); c.fillStyle = '#fff1bd'; c.fillRect(p.x + q.x - 2, p.y + q.y - 25, 4, 7); }
    if (e.hp / e.maxHp < .45) {
      for (let i = 0; i < 3; i++) { const t = (time + i * .7 + e.id) % 2 / 2; c.globalAlpha = (1 - t) * .45; c.fillStyle = '#20312b'; c.fillRect(p.x - 6 + t * 12 + i * 4, p.y - 30 - t * 40, 7 + t * 12, 8 + t * 9); } c.globalAlpha = 1;
    }
    if (selected || hovered || time - e.lastHit < 4) {
      const width = d.kind === 'building' ? 48 : 32, top = p.y - (d.kind === 'building' ? 94 : e.type === 'infantry' ? 49 : 55);
      c.fillStyle = '#112b20'; c.fillRect(p.x - width / 2 - 1, top - 1, width + 2, 5); c.fillStyle = e.hp / e.maxHp > .55 ? '#b9cc84' : e.hp / e.maxHp > .25 ? '#dfb15a' : '#e06f4a'; c.fillRect(p.x - width / 2, top, width * Math.max(0, e.hp / e.maxHp), 3);
      if (e.type === 'transport') { c.font = '9px monospace'; c.textAlign = 'center'; c.fillStyle = '#e5d392'; c.fillText(`${e.cargo.reduce((n, id) => n + (TYPES[this.game.get(id)?.type]?.cargoSize || 0), 0)}/6`, p.x, top - 5); }
    }
    if (e.repair) { c.fillStyle = '#c6d89b'; c.font = 'bold 15px monospace'; c.fillText('+', p.x + 22, p.y - 68); }
    if (d.kind === 'building' && this.game.players[e.team].lowPower && (d.power || 0) < 0) { c.font = '18px monospace'; c.fillStyle = '#edb767'; c.fillText('ϟ', p.x, p.y - 72); }
  }
  drawPlacement() {
    const g = this.game, c = this.ctx, type = this.placement, x = Math.round(this.mouse.x), y = Math.round(this.mouse.y), d = TYPES[type], err = g.placementError(type, 0, x, y);
    const color = err ? '#f08068' : '#d4e9a2';
    for (const t of footprint(x, y, d.size)) this.diamond(t.x, t.y, 1, err ? '#ef664630' : '#cfeb8930', color);
    const p = project(x, y); c.globalAlpha = .55; c.drawImage(this.atlas.get(type), p.x - 128, p.y - 168, 256, 224); c.globalAlpha = 1;
    for (const e of g.structures(0)) if (distance(e, { x, y }) < 13) { const a = project(e.x, e.y); c.strokeStyle = '#c9d9933a'; c.setLineDash([4, 5]); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(p.x, p.y); c.stroke(); c.setLineDash([]); }
  }
  tooltip(e) {
    const d = TYPES[e.type], c = this.ctx, p = this.toScreen(e.x, e.y);
    const name = e.team === 1 && d.alliedName || d.name;
    c.font = '10px monospace'; const text = `${e.team === 0 ? 'SOV' : 'ALL'} · ${name.toUpperCase()}`, width = c.measureText(text).width + 18;
    const x = clamp(p.x - width / 2, 5, this.width - width - 5), y = clamp(p.y - (d.kind === 'building' ? 118 : 76) * this.camera.zoom, 76, this.height - 40);
    c.fillStyle = '#13251dee'; c.fillRect(x, y, width, 23); c.fillStyle = e.team === 0 ? '#d9e3b8' : '#c0e3e5'; c.textAlign = 'left'; c.fillText(text, x + 9, y + 15);
  }
  drawMinimap() {
    const c = this.mini.getContext('2d'), w = this.mini.width, h = this.mini.height, sx = w / SIZE, sy = h / SIZE, g = this.game;
    c.fillStyle = '#254b51'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x, t = g.map.tiles[i]; if (!t) continue; c.fillStyle = t === 1 ? '#657b51' : t === 2 ? '#b7ae7e' : '#899078'; c.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy));
      if (g.map.ore[i] > 10) { c.fillStyle = '#d4b865'; c.fillRect(x * sx, y * sy, sx, sy); }
    }
    for (const e of g.entities) if (g.visible(e, 0)) { c.fillStyle = this.selected.has(e.id) ? '#fff4b4' : e.team === 0 ? '#f47b59' : '#8bd1f3'; const size = TYPES[e.type].kind === 'building' ? 4 : 2.5; c.fillRect(e.x * sx - size / 2, e.y * sy - size / 2, size, size); }
    const corners = [[0, 0], [this.width, 0], [this.width, this.height], [0, this.height]].map(([x, y]) => this.toWorld(x, y));
    c.beginPath(); corners.forEach((p, i) => i ? c.lineTo(p.x * sx, p.y * sy) : c.moveTo(p.x * sx, p.y * sy)); c.closePath(); c.strokeStyle = '#f4e9af'; c.lineWidth = 1; c.stroke();
  }
}
