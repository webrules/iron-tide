export const SIZE = 64;
export const TEAMS = ['SOVIET', 'ALLIED'];
export const CATEGORIES = ['structures', 'infantry', 'vehicles', 'fleet'];
export const STARTS = [{ x: 24, y: 54 }, { x: 40, y: 9 }];
export const DIFFICULTIES = {
  easy: { attack: 600, interval: 210, think: 6, army: 0.72 },
  normal: { attack: 360, interval: 145, think: 4, army: 1 },
  hard: { attack: 230, interval: 95, think: 2.5, army: 1.25 },
};
export const TYPES = {
  yard: { name: 'Construction yard', kind: 'building', category: 'structures', hp: 2400, size: 3, cost: 2500, time: 0, power: 20, description: 'Your base of operations. Deploy an MCV to establish another.' },
  power: { name: 'Power plant', kind: 'building', category: 'structures', hp: 1000, size: 2, cost: 600, time: 20, power: 150, requires: ['yard'], description: 'Generates 150 MW. Low power slows production and disables guns.' },
  refinery: { name: 'Ore refinery', kind: 'building', category: 'structures', hp: 1600, size: 3, cost: 1800, time: 40, power: -30, requires: ['power'], description: 'Processes ore. Includes one miner. Build close to an ore field.' },
  barracks: { name: 'Barracks', kind: 'building', category: 'structures', hp: 1000, size: 2, cost: 500, time: 18, power: -15, requires: ['power'], description: 'Trains infantry to defend your coast and support landings.' },
  factory: { name: 'War factory', kind: 'building', category: 'structures', hp: 1800, size: 3, cost: 2000, time: 50, power: -40, requires: ['refinery', 'barracks'], description: 'Produces tanks, ore miners, and expansion MCVs.' },
  shipyard: { name: 'Naval shipyard', kind: 'building', category: 'structures', hp: 1800, size: 3, cost: 1200, time: 40, power: -35, domain: 'water', requires: ['refinery'], description: 'Place in coastal water near your base. Builds your navy.' },
  gun: { name: 'Coastal battery', kind: 'building', category: 'structures', hp: 1400, size: 2, cost: 900, time: 30, power: -30, requires: ['barracks'], damage: 100, range: 10.5, cooldown: 3.4, weapon: 'shell', description: 'Long-range coastal artillery. Requires a powered grid; cannot hit subs.' },
  infantry: { name: 'Conscript', alliedName: 'Rifleman', kind: 'unit', category: 'infantry', hp: 120, cost: 100, time: 8, speed: 1.1, domain: 'land', requires: ['barracks'], damage: 12, range: 3.5, cooldown: 1, weapon: 'bullet', cargoSize: 1, description: 'Inexpensive infantry. Best against infantry and exposed buildings.' },
  tank: { name: 'Heavy tank', alliedName: 'Medium tank', kind: 'unit', category: 'vehicles', hp: 600, cost: 800, time: 28, speed: 1.3, domain: 'land', requires: ['factory'], damage: 70, range: 5, cooldown: 2.2, weapon: 'shell', cargoSize: 2, description: 'Hard-hitting armor. Transport it ashore to destroy inland structures.' },
  miner: { name: 'Ore miner', kind: 'unit', category: 'vehicles', hp: 700, cost: 900, time: 30, speed: 1.2, domain: 'land', requires: ['factory'], cargoSize: 2, capacity: 360, description: 'Automatically gathers ore and returns it to a reachable refinery.' },
  mcv: { name: 'Mobile construction vehicle', short: 'MCV', kind: 'unit', category: 'vehicles', hp: 1000, cost: 2500, time: 65, speed: .85, domain: 'land', requires: ['factory'], cargoSize: 3, description: 'Deploy with D. Load into a transport to establish an island base.' },
  cruiser: { name: 'Missile cruiser', alliedName: 'Artillery cruiser', kind: 'unit', category: 'fleet', hp: 1500, cost: 2000, time: 65, speed: 1.05, domain: 'water', requires: ['shipyard', 'factory'], damage: 145, range: 11.5, cooldown: 4, weapon: 'shell', description: 'Your main bombardment ship. Attacks any visible target within range.' },
  sub: { name: 'Attack submarine', kind: 'unit', category: 'fleet', hp: 650, cost: 900, time: 32, speed: 1.6, domain: 'water', requires: ['shipyard'], damage: 115, range: 6, cooldown: 2.5, weapon: 'torpedo', detect: 5.5, team: 0, description: 'Hidden unless detected or firing. Hunts ships; detects nearby submarines.' },
  destroyer: { name: 'Escort destroyer', kind: 'unit', category: 'fleet', hp: 950, cost: 1100, time: 35, speed: 1.7, domain: 'water', requires: ['shipyard'], damage: 72, range: 6.5, cooldown: 1.8, weapon: 'shell', detect: 9, team: 1, description: 'Fast Allied escort. Detects submarines at long range.' },
  transport: { name: 'Landing transport', kind: 'unit', category: 'fleet', hp: 950, cost: 700, time: 30, speed: 1.5, domain: 'water', requires: ['shipyard'], capacity: 6, description: 'Six cargo slots. Right-click with land units to board; U to unload near a beach.' },
};
export const nameOf = e => e.team === 1 && TYPES[e.type].alliedName || TYPES[e.type].name;
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const tileIndex = (x, y) => Math.round(y) * SIZE + Math.round(x);
export function seeded(seed = 91849) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function coast(x, team) { return team === 1 ? 16 + Math.round(Math.sin(x * .2) * 1.5) : 47 + Math.round(Math.sin(x * .19 + 1) * 1.5); }
export function isBeachX(x) { return (x >= 9 && x <= 19) || (x >= 25 && x <= 38) || (x >= 46 && x <= 56); }
export function makeMap() {
  const tiles = new Uint8Array(SIZE * SIZE); // 0 ocean, 1 grass, 2 beach, 3 cliff
  const ore = new Float32Array(SIZE * SIZE);
  const oreMax = new Float32Array(SIZE * SIZE);
  const random = seeded();
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const i = y * SIZE + x, n = coast(x, 1), s = coast(x, 0);
    const island = ((x - 32) / 7) ** 2 + ((y - 32) / 6) ** 2;
    if (y <= n || y >= s) {
      const edge = Math.min(Math.abs(y - n), Math.abs(y - s));
      tiles[i] = edge <= 1 ? (isBeachX(x) ? 2 : 3) : 1;
    } else if (island < 1) tiles[i] = island > .62 ? 2 : 1;
    const fields = [[14, 55, 5, 3], [37, 57, 5, 3], [24, 6, 5, 3], [49, 7, 5, 3], [32, 32, 4, 3]];
    for (const [ox, oy, rx, ry] of fields) if (tiles[i] === 1 && ((x - ox) / rx) ** 2 + ((y - oy) / ry) ** 2 < 1 && random() > .12) {
      ore[i] = oreMax[i] = 300 + random() * 400;
    }
  }
  return { tiles, ore, oreMax };
}
export function footprint(x, y, size) {
  const result = [], low = Math.floor(size / 2);
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) result.push({ x: Math.round(x) - low + dx, y: Math.round(y) - low + dy });
  return result;
}

class Heap {
  constructor() { this.a = []; }
  push(v) { const a = this.a; a.push(v); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= v.f) break; a[i] = a[p]; i = p; } a[i] = v; }
  pop() { const a = this.a, first = a[0], last = a.pop(); if (a.length) { let i = 0; while (i * 2 + 1 < a.length) { let c = i * 2 + 1; if (c + 1 < a.length && a[c + 1].f < a[c].f) c++; if (a[c].f >= last.f) break; a[i] = a[c]; i = c; } a[i] = last; } return first; }
}

export function findPath(game, from, to, domain, maxVisits = 4300) {
  const sx = clamp(Math.round(from.x), 0, SIZE - 1), sy = clamp(Math.round(from.y), 0, SIZE - 1);
  const end = game.nearFree(to.x, to.y, domain, 10);
  if (!end) return null;
  const ex = end.x, ey = end.y, start = sy * SIZE + sx, goal = ey * SIZE + ex;
  if (start === goal) return [];
  const score = new Float32Array(SIZE * SIZE).fill(Infinity), came = new Int32Array(SIZE * SIZE).fill(-1), closed = new Uint8Array(SIZE * SIZE);
  const open = new Heap(); score[start] = 0; open.push({ i: start, f: 0 }); let visited = 0;
  const steps = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  while (open.a.length && visited++ < maxVisits) {
    const { i } = open.pop(); if (closed[i]) continue;
    if (i === goal) { const path = []; let p = goal; while (p !== start) { path.push({ x: p % SIZE, y: Math.floor(p / SIZE) }); p = came[p]; } return path.reverse(); }
    closed[i] = 1; const x = i % SIZE, y = Math.floor(i / SIZE);
    for (const [dx, dy] of steps) {
      const nx = x + dx, ny = y + dy;
      if (!game.passable(nx, ny, domain)) continue;
      if (dx && dy && (!game.passable(x + dx, y, domain) || !game.passable(x, y + dy, domain))) continue;
      const ni = ny * SIZE + nx, nextScore = score[i] + (dx && dy ? 1.414 : 1);
      if (closed[ni] || nextScore >= score[ni]) continue;
      score[ni] = nextScore; came[ni] = i;
      open.push({ i: ni, f: nextScore + Math.hypot(ex - nx, ey - ny) });
    }
  }
  return null;
}

export class Game {
  constructor(difficulty = 'normal', seed = 49) {
    this.map = makeMap(); this.random = seeded(seed); this.entities = []; this.projectiles = []; this.effects = []; this.events = []; this.time = 0; this.nextId = 1;
    this.difficulty = difficulty; this.blocked = new Uint8Array(SIZE * SIZE); this.ended = false; this.winner = null;
    this.stats = { destroyed: [0, 0], lost: [0, 0], mined: [0, 0] };
    this.players = [0, 1].map(team => ({ credits: 12000, queues: Object.fromEntries(CATEGORIES.map(c => [c, []])), generated: 0, used: 0, lowPower: false, team }));
    this.ai = { nextThink: 3, nextAttack: DIFFICULTIES[difficulty].attack, attacks: 0, expansion: false };
    this.tickNumber = 0; this.spawn('mcv', 0, STARTS[0].x, STARTS[0].y); this.spawn('mcv', 1, STARTS[1].x, STARTS[1].y);
  }
  notify(message, danger = false) { this.events.push({ kind: 'message', message, danger }); }
  spawn(type, team, x, y) {
    const def = TYPES[type]; const e = { id: this.nextId++, type, team, x, y, hp: def.hp, maxHp: def.hp, angle: team === 0 ? -Math.PI / 2 : Math.PI / 2, turretAngle: -Math.PI / 2, order: null, path: [], cargo: [], ore: 0, cooldown: this.random(), revealedUntil: 0, born: this.time, lastPath: -10, lastHit: -10, moving: false };
    if (type === 'tank' && team === 1) { e.hp = e.maxHp = 480; }
    this.entities.push(e);
    if (def.kind === 'building') { this.rebuildBlocked(); this.updatePower(); }
    if (type === 'miner') e.order = { type: 'harvest', phase: 'seek' };
    return e;
  }
  get(id) { return this.entities.find(e => e.id === id && e.hp > 0); }
  owned(team, type) { return this.entities.filter(e => e.team === team && e.hp > 0 && (!type || e.type === type)); }
  structures(team) { return this.owned(team).filter(e => TYPES[e.type].kind === 'building'); }
  units(team) { return this.owned(team).filter(e => TYPES[e.type].kind === 'unit'); }
  rebuildBlocked() {
    this.blocked.fill(0);
    for (const e of this.entities) if (e.hp > 0 && TYPES[e.type].kind === 'building') for (const t of footprint(e.x, e.y, TYPES[e.type].size)) if (this.inside(t.x, t.y)) this.blocked[t.y * SIZE + t.x] = 1;
  }
  inside(x, y) { return x >= 0 && y >= 0 && x < SIZE && y < SIZE; }
  passable(x, y, domain) {
    x = Math.round(x); y = Math.round(y); if (!this.inside(x, y)) return false;
    const i = y * SIZE + x, tile = this.map.tiles[i];
    return !this.blocked[i] && (domain === 'water' ? tile === 0 : tile === 1 || tile === 2);
  }
  nearFree(x, y, domain, radius = 6, extra = () => true) {
    x = Math.round(x); y = Math.round(y);
    if (this.passable(x, y, domain) && extra(x, y)) return { x, y };
    for (let r = 1; r <= radius; r++) {
      const candidates = [];
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && this.passable(x + dx, y + dy, domain) && extra(x + dx, y + dy)) candidates.push({ x: x + dx, y: y + dy });
      candidates.sort((a, b) => distance(a, { x, y }) - distance(b, { x, y }));
      if (candidates.length) return candidates[0];
    }
    return null;
  }
  updatePower() {
    for (const p of this.players) { p.generated = 0; p.used = 0; for (const e of this.structures(p.team)) { const power = TYPES[e.type].power || 0; if (power > 0) p.generated += power; else p.used -= power; } p.lowPower = p.used > p.generated; }
  }
  canBuild(type, team) {
    const d = TYPES[type]; if (!d || type === 'yard') return 'Unavailable';
    if (d.team !== undefined && d.team !== team) return 'Other faction';
    if (d.kind === 'building' && !this.owned(team, 'yard').length) return 'Deploy an MCV';
    for (const required of d.requires || []) if (!this.owned(team, required).length) return `Requires ${TYPES[required].name}`;
    if (this.players[team].credits < d.cost) return 'Insufficient funds';
    if (d.kind === 'unit' && this.units(team).length >= 120) return 'Unit limit reached (120)';
    return null;
  }
  queue(type, team = 0) {
    const error = this.canBuild(type, team); if (error) { if (!team) this.notify(error); return false; }
    const d = TYPES[type], lane = this.players[team].queues[d.category];
    if (lane.length >= (d.kind === 'building' ? 1 : 5)) { if (!team) this.notify(d.kind === 'building' ? 'Place or cancel your current structure first.' : 'Production queue is full.'); return false; }
    this.players[team].credits -= d.cost; lane.push({ type, progress: 0, total: d.time, paid: d.cost });
    if (!team) this.events.push({ kind: 'sound', sound: 'queue' }); return true;
  }
  cancelQueue(category, team = 0, index = 0) {
    const q = this.players[team].queues[category]; if (!q[index]) return;
    this.players[team].credits += q[index].paid; q.splice(index, 1);
    if (!team) this.notify('Production cancelled. Funds returned.');
  }
  placementError(type, team, x, y, deploying = false) {
    const d = TYPES[type], domain = d.domain || 'land';
    for (const t of footprint(x, y, d.size)) {
      if (!this.passable(t.x, t.y, domain)) return domain === 'water' ? 'Needs clear coastal water.' : 'Needs clear, flat ground.';
      if (this.map.oreMax[t.y * SIZE + t.x] > 0) return 'Cannot build over an ore field.';
      if (this.entities.some(e => e.hp > 0 && !e.embarked && TYPES[e.type].kind === 'unit' && e.type !== (deploying ? 'mcv' : '') && distance(e, t) < .65)) return 'A unit is blocking placement.';
    }
    if (!deploying && !this.structures(team).some(e => distance(e, { x, y }) <= 8.5)) return 'Place within 8 tiles of your base.';
    if (type === 'shipyard') {
      let shore = false;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (this.inside(x + dx, y + dy) && this.map.tiles[(y + dy) * SIZE + x + dx] === 2) shore = true;
      if (!shore) return 'Shipyards must be beside a beach.';
    }
    return null;
  }
  place(type, team, x, y) {
    x = Math.round(x); y = Math.round(y); const q = this.players[team].queues.structures;
    if (!q.length || q[0].type !== type || q[0].progress < q[0].total || !this.owned(team, 'yard').length) return false;
    const err = this.placementError(type, team, x, y); if (err) { if (!team) this.notify(err); return false; }
    const e = this.spawn(type, team, x, y); q.shift();
    if (type === 'refinery') { const pos = this.nearFree(x, y + (team === 0 ? -2 : 2), 'land', 5); if (pos) this.spawn('miner', team, pos.x, pos.y); }
    if (!team) { this.notify(`${TYPES[type].name} operational.`); this.events.push({ kind: 'sound', sound: 'ready' }); }
    return e;
  }
  deploy(e) {
    if (!e || e.type !== 'mcv' || e.embarked || e.hp <= 0) return false;
    const x = Math.round(e.x), y = Math.round(e.y), err = this.placementError('yard', e.team, x, y, true);
    if (err) { if (!e.team) this.notify(`Cannot deploy: ${err}`); return false; }
    const hpRatio = e.hp / e.maxHp; this.entities = this.entities.filter(u => u !== e);
    const yard = this.spawn('yard', e.team, x, y); yard.hp = Math.max(yard.maxHp * .5, yard.maxHp * hpRatio);
    if (!e.team) { this.notify('Construction yard deployed. Establish your power grid.'); this.events.push({ kind: 'deployed', id: yard.id }); }
    return yard;
  }
  sell(e) {
    if (!e || e.team !== 0 || TYPES[e.type].kind !== 'building') return false;
    this.players[0].credits += Math.floor(TYPES[e.type].cost * .5); e.hp = 0; e.sold = true;
    this.notify(`${nameOf(e)} sold. 50% refunded.`); this.cleanup(); return true;
  }
  visible(e, team) {
    if (!e || e.embarked || e.hp <= 0) return false;
    if (e.team === team || e.type !== 'sub' || e.revealedUntil > this.time) return true;
    return this.entities.some(u => u.hp > 0 && !u.embarked && u.team === team && TYPES[u.type].detect && distance(u, e) <= TYPES[u.type].detect);
  }
  canAttack(e, target) {
    if (!e || !target || !TYPES[e.type].damage || e.team === target.team || !this.visible(target, e.team)) return false;
    if (e.type === 'sub' && TYPES[target.type].domain !== 'water') return false;
    if (target.type === 'sub' && !['sub', 'destroyer', 'cruiser'].includes(e.type)) return false;
    if (TYPES[e.type].domain === 'land' && target.type === 'sub') return false;
    return true;
  }
  order(ids, order) {
    let count = 0;
    for (const id of ids) {
      const e = this.get(id); if (!e || e.embarked || TYPES[e.type].kind !== 'unit') continue;
      if (order.type === 'board' && TYPES[e.type].domain !== 'land') continue;
      if (order.type === 'harvest' && e.type !== 'miner') continue;
      const o = { ...order };
      if (order.type === 'move' || order.type === 'attackMove') {
        const domain = TYPES[e.type].domain;
        const goal = this.nearFree(order.x + (ids.length > 1 ? count % 3 - 1 : 0), order.y + (ids.length > 1 ? Math.floor(count / 3) % 3 - 1 : 0), domain, 5);
        if (!goal) continue;
        if (distance(goal, order) > 6) continue;
        o.x = goal.x; o.y = goal.y;
      }
      e.order = o; e.path = []; e.lastPath = -10; e.targetId = null;
      if (o.type === 'stop') e.order = { type: 'hold' };
      count++;
    }
    return count;
  }
  move(e, goal, dt, reach = .15) {
    if (distance(e, goal) <= reach) { e.path = []; return true; }
    if (this.time - e.lastPath > 2.5 && (!e.path.length || !e.pathGoal || distance(goal, e.pathGoal) > 1.8)) {
      e.path = findPath(this, e, goal, TYPES[e.type].domain) || []; e.lastPath = this.time; e.pathGoal = { ...goal };
    }
    if (!e.path.length) return distance(e, goal) < Math.max(reach, .65);
    const p = e.path[0]; if (!this.passable(p.x, p.y, TYPES[e.type].domain)) { e.path = []; e.lastPath = -10; return false; }
    const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy);
    let speed = TYPES[e.type].speed * (e.type === 'tank' && e.team === 1 ? 1.3 : 1);
    const step = Math.min(speed * dt, dist);
    if (dist > .001) { e.x += dx / dist * step; e.y += dy / dist * step; e.angle = Math.atan2(dy, dx); e.moving = true; }
    if (dist < speed * dt + .03) e.path.shift();
    return distance(e, goal) <= Math.max(reach, .2);
  }
  attack(e, target, dt, pursue = true) {
    const d = TYPES[e.type], range = d.range + (TYPES[target.type].kind === 'building' ? TYPES[target.type].size * .25 : 0);
    e.turretAngle = Math.atan2(target.y - e.y, target.x - e.x);
    if (distance(e, target) > range) {
      if (pursue && d.kind === 'unit') {
        const dx = e.x - target.x, dy = e.y - target.y, len = Math.hypot(dx, dy) || 1;
        const desired = { x: target.x + dx / len * (range - .9), y: target.y + dy / len * (range - .9) };
        this.move(e, desired, dt);
      }
      return;
    }
    e.path = [];
    if (e.cooldown > 0 || (e.type === 'gun' && this.players[e.team].lowPower)) return;
    e.cooldown = d.cooldown; e.firingUntil = this.time + .25;
    if (e.type === 'sub') e.revealedUntil = this.time + 3;
    let damage = d.damage * (e.type === 'tank' && e.team === 1 ? .8 : 1);
    if (e.type === 'infantry' && !['infantry', 'power', 'barracks'].includes(target.type)) damage *= .4;
    const travel = d.weapon === 'bullet' ? .08 : distance(e, target) / (d.weapon === 'torpedo' ? 7 : 16);
    this.projectiles.push({ x: e.x, y: e.y, fromX: e.x, fromY: e.y, toX: target.x, toY: target.y, targetId: target.id, team: e.team, damage, weapon: d.weapon, life: travel, total: travel, source: e.id });
    this.events.push({ kind: 'sound', sound: d.weapon, x: e.x, y: e.y });
  }
  acquire(e) {
    const def = TYPES[e.type], targets = this.entities.filter(t => this.canAttack(e, t) && distance(e, t) <= def.range + (e.order?.type === 'attackMove' ? 3 : .8));
    targets.sort((a, b) => (TYPES[a.type].damage ? -3 : 0) + distance(e, a) - ((TYPES[b.type].damage ? -3 : 0) + distance(e, b)));
    return targets[0];
  }
  unload(e) {
    if (!e || e.type !== 'transport' || !e.cargo.length) return false;
    const choices = [];
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const x = Math.round(e.x) + dx, y = Math.round(e.y) + dy;
      if (this.passable(x, y, 'land') && this.map.tiles[y * SIZE + x] === 2 && distance(e, { x, y }) <= 3.2) choices.push({ x, y });
    }
    if (!choices.length) { if (!e.team) this.notify('Move the transport beside a sandy beach to unload.'); return false; }
    choices.sort((a, b) => distance(e, a) - distance(e, b));
    let count = 0;
    for (const id of [...e.cargo]) {
      const u = this.get(id); if (!u) continue;
      const pos = this.nearFree(choices[0].x, choices[0].y, 'land', 3, (x, y) => !this.entities.some(v => !v.embarked && v.hp > 0 && distance(v, { x, y }) < .6));
      if (!pos) continue;
      u.x = pos.x; u.y = pos.y; u.embarked = null; u.order = u.type === 'miner' ? { type: 'harvest', phase: 'seek' } : null; u.path = []; u.lastPath = -10; e.cargo = e.cargo.filter(n => n !== id); count++;
    }
    if (!e.team && count) this.notify(`${count} unit${count > 1 ? 's' : ''} ashore. Beachhead established.`);
    return count > 0;
  }
  board(e, transport, dt) {
    if (!transport || transport.team !== e.team || transport.type !== 'transport') { e.order = null; return; }
    const used = transport.cargo.reduce((sum, id) => sum + (TYPES[this.get(id)?.type]?.cargoSize || 0), 0);
    if (used + TYPES[e.type].cargoSize > 6) { if (!e.team) this.notify('Transport at capacity.'); e.order = null; return; }
    if (distance(e, transport) <= 3.2) {
      // Loading must cross a beach, never a cliff or a strip of another island.
      const beach = this.nearFree(transport.x, transport.y, 'land', 3, (x, y) => this.map.tiles[y * SIZE + x] === 2 && distance(e, { x, y }) <= 2.3);
      if (beach) { e.embarked = transport.id; transport.cargo.push(e.id); e.path = []; e.order = null; return; }
    }
    const pos = this.nearFree(transport.x, transport.y, 'land', 4, (x, y) => this.map.tiles[y * SIZE + x] === 2);
    if (pos) this.move(e, pos, dt);
  }
  harvest(e, dt) {
    let o = e.order;
    if (!o || o.type !== 'harvest') return;
    if (o.phase === 'seek' || !o.phase) {
      if (e.ore >= TYPES.miner.capacity - 1) { o.phase = 'return'; return; }
      const candidates = [];
      if (o.oreIndex !== undefined && this.map.ore[o.oreIndex] > 2) candidates.push(o.oreIndex);
      else for (let i = 0; i < this.map.ore.length; i++) if (this.map.ore[i] > 5) candidates.push(i);
      const assigned = new Set(this.owned(e.team, 'miner').filter(m => m !== e && m.order?.phase === 'mine').map(m => m.order.oreIndex));
      candidates.sort((a, b) => distance(e, { x: a % SIZE, y: Math.floor(a / SIZE) }) + (assigned.has(a) ? 6 : 0) - distance(e, { x: b % SIZE, y: Math.floor(b / SIZE) }) - (assigned.has(b) ? 6 : 0));
      for (const i of candidates.slice(0, 16)) {
        const goal = { x: i % SIZE, y: Math.floor(i / SIZE) }, path = findPath(this, e, goal, 'land');
        if (path) { e.path = path; e.pathGoal = goal; e.lastPath = this.time; o.oreIndex = i; o.phase = 'mine'; o.goal = goal; return; }
      }
      o.phase = e.ore > 0 ? 'return' : 'wait'; o.wait = 4; return;
    }
    if (o.phase === 'wait') { o.wait -= dt; if (o.wait <= 0) o.phase = 'seek'; return; }
    if (o.phase === 'mine') {
      if (distance(e, o.goal) > .6) { this.move(e, o.goal, dt, .5); return; }
      const amount = Math.min(24 * dt, this.map.ore[o.oreIndex], TYPES.miner.capacity - e.ore);
      e.ore += amount; this.map.ore[o.oreIndex] -= amount; e.mining = true;
      if (e.ore >= TYPES.miner.capacity - .01) o.phase = 'return';
      else if (this.map.ore[o.oreIndex] < .1) { o.phase = 'seek'; delete o.oreIndex; }
      return;
    }
    if (o.phase === 'return') {
      const refs = this.owned(e.team, 'refinery').sort((a, b) => distance(e, a) - distance(e, b));
      for (const r of refs) {
        const goal = this.nearFree(r.x, r.y, 'land', 5), path = goal && findPath(this, e, goal, 'land');
        if (path) { o.refinery = r.id; o.goal = goal; o.phase = 'deliver'; e.path = path; e.pathGoal = goal; e.lastPath = this.time; return; }
      }
      o.phase = 'wait'; o.wait = 5; return;
    }
    if (o.phase === 'deliver') {
      if (!this.get(o.refinery)) { o.phase = 'return'; return; }
      if (this.move(e, o.goal, dt, .4)) {
        const amount = Math.floor(e.ore); this.players[e.team].credits += amount; this.stats.mined[e.team] += amount; e.ore = 0;
        if (!e.team) this.effects.push({ type: 'income', x: e.x, y: e.y, amount, life: 2, total: 2 });
        e.order = { type: 'harvest', phase: 'seek' };
      }
    }
  }
  production(dt) {
    for (const p of this.players) for (const category of CATEGORIES) {
      const q = p.queues[category], current = q[0]; if (!current) continue;
      const producer = category === 'structures' ? 'yard' : category === 'infantry' ? 'barracks' : category === 'vehicles' ? 'factory' : 'shipyard';
      const buildings = this.owned(p.team, producer); if (!buildings.length) continue;
      if (current.progress < current.total) {
        current.progress = Math.min(current.total, current.progress + dt * (p.lowPower ? .4 : 1));
        if (current.progress >= current.total && p.team === 0 && category === 'structures') { this.notify(`${TYPES[current.type].name} ready. Click its card to place.`); this.events.push({ kind: 'sound', sound: 'ready' }); }
      }
      if (current.progress < current.total || category === 'structures' || this.units(p.team).length >= 120) continue;
      const source = buildings.find(b => b.id === current.source) || buildings[0], d = TYPES[current.type];
      const pos = this.nearFree(source.x, source.y + (p.team ? 2 : -2), d.domain, 6, (x, y) => !this.entities.some(e => e.hp > 0 && !e.embarked && distance(e, { x, y }) < .75));
      if (!pos) continue;
      const e = this.spawn(current.type, p.team, pos.x, pos.y); q.shift();
      if (source.rally && current.type !== 'miner') this.order([e.id], { type: 'move', ...source.rally });
      if (p.team === 0) { this.events.push({ kind: 'sound', sound: 'unit' }); this.notify(`${nameOf(e)} reporting for duty.`); }
    }
  }
  cleanup() {
    let structuresChanged = false;
    for (const e of this.entities.filter(e => e.hp <= 0 && !e.cleaned)) {
      e.cleaned = true; structuresChanged ||= TYPES[e.type].kind === 'building';
      if (!e.sold) { this.stats.lost[e.team]++; this.stats.destroyed[1 - e.team]++; }
      if (!e.embarked) this.effects.push({ type: 'explosion', x: e.x, y: e.y, life: 1.2, total: 1.2, size: TYPES[e.type].kind === 'building' ? 2.5 : 1.2 });
      for (const id of e.cargo) { const unit = this.get(id); if (unit) { unit.hp = 0; unit.cleaned = true; this.stats.lost[unit.team]++; this.stats.destroyed[1 - unit.team]++; } }
      if (e.embarked) { const transport = this.get(e.embarked); if (transport) transport.cargo = transport.cargo.filter(id => id !== e.id); }
      if (!e.team && !e.sold && TYPES[e.type].kind === 'building') this.notify(`${nameOf(e)} destroyed!`, true);
    }
    this.entities = this.entities.filter(e => e.hp > 0);
    if (structuresChanged) { this.rebuildBlocked(); this.updatePower(); }
  }
  checkVictory() {
    if (this.ended) return;
    const alive = [0, 1].map(team => this.structures(team).length > 0 || this.owned(team, 'mcv').length > 0);
    if (!alive[0] || !alive[1]) { this.ended = true; this.winner = alive[0] === alive[1] ? -1 : alive[0] ? 0 : 1; this.events.push({ kind: 'end', winner: this.winner }); }
  }
  separateUnits(dt) {
    const units = this.entities.filter(e => e.hp > 0 && !e.embarked && TYPES[e.type].kind === 'unit');
    for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
      const a = units[i], b = units[j], domain = TYPES[a.type].domain;
      if (domain !== TYPES[b.type].domain || Math.abs(a.x - b.x) > 2 || Math.abs(a.y - b.y) > 2) continue;
      const radius = type => type === 'infantry' ? .22 : type === 'cruiser' ? .8 : TYPES[type].domain === 'water' ? .65 : .42;
      const min = radius(a.type) + radius(b.type), d = distance(a, b);
      if (d >= min) continue;
      const angle = d > .001 ? Math.atan2(a.y - b.y, a.x - b.x) : ((a.id * 13 + b.id * 7) % 16) * Math.PI / 8;
      const force = Math.min((min - d) * .5, dt * .8), dx = Math.cos(angle) * force, dy = Math.sin(angle) * force;
      if (this.passable(a.x + dx, a.y + dy, domain)) { a.x += dx; a.y += dy; }
      if (this.passable(b.x - dx, b.y - dy, domain)) { b.x -= dx; b.y -= dy; }
    }
  }
  step(dt) {
    if (this.ended) return;
    this.time += dt; this.tickNumber++; this.production(dt);
    for (let i = 0; i < this.map.ore.length; i++) if (this.map.oreMax[i]) this.map.ore[i] = Math.min(this.map.oreMax[i], this.map.ore[i] + dt * .12);
    for (const e of this.entities) {
      if (e.hp <= 0 || e.embarked) continue;
      const d = TYPES[e.type]; e.moving = false; e.mining = false; e.cooldown -= dt;
      if (e.repair && e.hp < e.maxHp && this.players[e.team].credits > 2) { const restored = Math.min(e.maxHp - e.hp, 35 * dt); this.players[e.team].credits -= restored * TYPES[e.type].cost / e.maxHp * .65; e.hp += restored; }
      if (e.hp >= e.maxHp) e.repair = false;
      if (d.kind === 'building') { if (d.damage) { const t = this.acquire(e); if (t) this.attack(e, t, dt, false); } continue; }
      const o = e.order;
      if (o?.type === 'harvest') { this.harvest(e, dt); continue; }
      if (o?.type === 'board') { this.board(e, this.get(o.targetId), dt); continue; }
      if (o?.type === 'move') { if (this.move(e, o, dt, .3)) e.order = e.type === 'miner' ? { type: 'harvest', phase: 'seek' } : null; continue; }
      if (o?.type === 'attack') {
        const target = this.get(o.targetId); if (this.canAttack(e, target)) { this.attack(e, target, dt); continue; }
        e.order = null; e.path = [];
      }
      const target = d.damage && this.acquire(e);
      if (target) { this.attack(e, target, dt, o?.type === 'attackMove'); continue; }
      if (o?.type === 'attackMove' && this.move(e, o, dt, .5)) e.order = null;
    }
    for (const p of this.projectiles) {
      p.life -= dt;
      if (p.life > 0) continue;
      const target = this.get(p.targetId);
      if (target && !target.embarked) {
        target.hp -= p.damage; target.lastHit = this.time;
        if (target.team === 0 && this.time - (this.lastWarning || -100) > 12) { this.notify('Our forces are under attack!', true); this.lastWarning = this.time; }
        this.effects.push({ type: 'impact', x: target.x, y: target.y, life: .45, total: .45, size: p.weapon === 'bullet' ? .3 : .9 });
      }
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0);
    for (const f of this.effects) f.life -= dt;
    this.effects = this.effects.filter(f => f.life > 0);
    this.separateUnits(dt); this.cleanup(); this.thinkAI(); this.checkVictory();
  }
  aiPlacement(type) {
    const anchors = this.structures(1).filter(e => e.type !== 'shipyard'); if (!anchors.length) return null;
    const island = this.owned(1, 'yard').find(e => e.y > 24 && e.y < 40);
    const islandRefinery = this.owned(1, 'refinery').some(e => e.y > 24 && e.y < 40);
    const preferred = type === 'refinery' && island && !islandRefinery ? { x: 36, y: 32 } : type === 'shipyard' ? { x: 34, y: coast(34, 1) + 3 } : type === 'gun' ? { x: 32, y: coast(32, 1) - 2 } : type === 'factory' ? { x: 35, y: 13 } : { x: 39, y: 12 };
    const possible = [];
    for (let y = 2; y < SIZE - 2; y++) for (let x = 3; x < SIZE - 3; x++) {
      if (!anchors.some(a => distance(a, { x, y }) < 8.5)) continue;
      if (!this.placementError(type, 1, x, y)) possible.push({ x, y, score: distance({ x, y }, preferred) + this.random() * 3 });
    }
    possible.sort((a, b) => a.score - b.score); return possible[0] || null;
  }
  thinkAI() {
    const cfg = DIFFICULTIES[this.difficulty]; if (this.time < this.ai.nextThink) return;
    this.ai.nextThink = this.time + cfg.think;
    const p = this.players[1], have = type => this.owned(1, type).length;
    const mcvs = this.owned(1, 'mcv').filter(e => !e.embarked);
    for (const mcv of mcvs) if (!have('yard') || (mcv.x > 25 && mcv.x < 39 && mcv.y > 25 && mcv.y < 39)) {
      if (!this.deploy(mcv)) { const pos = this.nearFree(mcv.x + 3, mcv.y, 'land', 6, (x, y) => !this.placementError('yard', 1, x, y, true)); if (pos) this.order([mcv.id], { type: 'move', ...pos }); }
    }
    if (!have('yard')) { if (have('factory') && !p.queues.vehicles.length && p.credits >= TYPES.mcv.cost) this.queue('mcv', 1); return; }
    const structure = p.queues.structures[0];
    if (structure && structure.progress >= structure.total) { const pos = this.aiPlacement(structure.type); if (pos) this.place(structure.type, 1, pos.x, pos.y); }
    if (!p.queues.structures.length) {
      let type = null;
      if (!have('power') || p.generated - p.used < 40) type = 'power';
      else if (!have('refinery')) type = 'refinery';
      else if (!have('barracks')) type = 'barracks';
      else if (!have('factory')) type = 'factory';
      else if (!have('shipyard')) type = 'shipyard';
      else if (this.owned(1, 'yard').some(e => e.y > 24 && e.y < 40) && !this.owned(1, 'refinery').some(e => e.y > 24 && e.y < 40)) type = 'refinery';
      else if (have('refinery') < 2 && this.time > 240) type = 'refinery';
      else if (have('gun') < (this.difficulty === 'hard' ? 4 : 2) && this.time > 250) type = 'gun';
      if (type) this.queue(type, 1);
    }
    for (const e of this.structures(1)) if (e.hp / e.maxHp < .7 && p.credits > 800) e.repair = true;
    const queued = type => CATEGORIES.some(c => p.queues[c].some(q => q.type === type));
    if (!p.queues.vehicles.length && have('factory')) {
      if (have('miner') < Math.min(have('refinery') * 2, 5)) this.queue('miner', 1);
      else if (this.difficulty !== 'easy' && this.time > 700 && !have('mcv') && !this.ai.expansion && have('transport') && p.credits > 3100) this.queue('mcv', 1);
      else if (have('tank') < 12 * cfg.army && p.credits > 1400) this.queue('tank', 1);
    }
    if (!p.queues.infantry.length && have('infantry') < 8 * cfg.army && p.credits > 1000) this.queue('infantry', 1);
    if (!p.queues.fleet.length && have('shipyard')) {
      let type = 'cruiser';
      const enemySubs = this.owned(0, 'sub').filter(e => this.visible(e, 1)).length;
      if (have('destroyer') < Math.max(2, this.difficulty === 'hard' ? Math.ceil(enemySubs * .8) : 2)) type = 'destroyer';
      else if (have('transport') < (this.difficulty === 'easy' ? 1 : 2) && have('tank') >= 2) type = 'transport';
      else if (have('cruiser') >= Math.floor(6 * cfg.army)) type = have('destroyer') < 5 ? 'destroyer' : null;
      if (type && p.credits > TYPES[type].cost + 350) this.queue(type, 1);
    }
    // Assemble and land troops using the same transport rules as the player.
    for (const transport of this.owned(1, 'transport')) this.aiTransport(transport, cfg);
    // Island expansion competes for the same money, production, and transport space.
    const expansionMCV = this.owned(1, 'mcv').find(e => !e.embarked);
    if (expansionMCV && !this.ai.expansion) {
      const transport = this.owned(1, 'transport').find(e => !e.cargo.length && (!e.mission || e.mission === 'load'));
      if (transport) {
        for (const u of this.units(1)) if (u.order?.type === 'board' && u.order.targetId === transport.id) { u.order = null; u.path = []; }
        transport.mission = 'expand'; transport.loadSince = this.time; this.order([transport.id], { type: 'move', x: 32, y: coast(32, 1) + 2 }); this.order([expansionMCV.id], { type: 'board', targetId: transport.id });
      }
    }
    // Defensive reactions use only visible attackers.
    const threat = this.owned(0).find(e => !e.embarked && this.visible(e, 1) && e.y < 24 && TYPES[e.type].damage);
    if (threat) for (const e of this.units(1)) if (TYPES[e.type].damage && !e.embarked && !e.order && this.canAttack(e, threat)) this.order([e.id], { type: 'attack', targetId: threat.id });
    if (this.time >= this.ai.nextAttack) {
      this.ai.nextAttack = this.time + cfg.interval; this.ai.attacks++;
      const targets = this.structures(0).sort((a, b) => (a.y - b.y) + (a.type === 'gun' ? -4 : 0) - (b.type === 'gun' ? -4 : 0));
      const target = targets[0] || this.owned(0, 'mcv')[0];
      if (target) for (const e of this.units(1)) if (['cruiser', 'destroyer'].includes(e.type)) {
        if (e.type === 'cruiser') this.order([e.id], { type: 'attack', targetId: target.id });
        else { const cruise = this.owned(1, 'cruiser')[0]; this.order([e.id], { type: 'attackMove', x: target.x + (cruise ? 2 : -2), y: coast(target.x, 0) - 4 }); }
      }
      if (this.ai.attacks === 1) this.notify('Enemy fleet movement detected in the strait.', true);
    }
    // Reassign landed armor after each target falls. Inland destruction requires tanks.
    for (const e of this.units(1)) if (['tank', 'infantry'].includes(e.type) && !e.embarked && e.y > 44 && (!e.order || e.order.type !== 'board')) {
      const target = this.structures(0).sort((a, b) => distance(a, e) - distance(b, e))[0] || this.owned(0, 'mcv').find(m => !m.embarked);
      if (target && (e.order?.type !== 'attack' || !this.get(e.order.targetId))) this.order([e.id], { type: 'attack', targetId: target.id });
    }
    // Keep idle attacking ships useful after a coastal target is destroyed.
    for (const e of this.owned(1, 'cruiser')) if (this.time > cfg.attack && !e.order) {
      const t = this.owned(0).filter(u => !u.embarked && this.canAttack(e, u)).sort((a, b) => distance(e, a) - distance(e, b))[0];
      if (t) this.order([e.id], { type: 'attack', targetId: t.id });
    }
  }
  aiTransport(t, cfg) {
    const northDock = { x: 32, y: coast(32, 1) + 2 };
    if (t.mission === 'expand') {
      if (t.cargo.some(id => this.get(id)?.type === 'mcv')) {
        if (t.y < 24.5) { if (!t.order || t.order.y !== 25) this.order([t.id], { type: 'move', x: 32, y: 25 }); }
        else if (this.unload(t)) { this.ai.expansion = true; t.mission = 'return'; this.order([t.id], { type: 'move', ...northDock }); }
      }
      return;
    }
    if (this.time < cfg.attack - 70) return;
    if (!t.mission) { t.mission = 'load'; t.loadSince = this.time; this.order([t.id], { type: 'move', ...northDock }); }
    if (t.mission === 'load') {
      if (distance(t, northDock) > 2) { if (!t.order) this.order([t.id], { type: 'move', ...northDock }); return; }
      const load = t.cargo.reduce((n, id) => n + (TYPES[this.get(id)?.type]?.cargoSize || 0), 0);
      if (load >= 6 || (load >= 2 && this.time - t.loadSince > 65)) {
        t.mission = 'land'; t.beach = this.difficulty === 'hard' ? [14, 31, 50][this.ai.attacks % 3] : 31;
        this.order([t.id], { type: 'move', x: t.beach, y: coast(t.beach, 0) - 2 });
      } else {
        let reserved = load;
        const troops = this.units(1).filter(e => ['tank', 'infantry'].includes(e.type) && !e.embarked && e.y < 23 && (e.order?.type !== 'board' || e.order.targetId === t.id)).sort((a, b) => (a.type === 'tank' ? -10 : 0) - (b.type === 'tank' ? -10 : 0));
        for (const u of troops) { if (reserved + TYPES[u.type].cargoSize > 6) continue; reserved += TYPES[u.type].cargoSize; if (u.order?.targetId !== t.id) this.order([u.id], { type: 'board', targetId: t.id }); }
      }
    } else if (t.mission === 'land') {
      if (t.y >= coast(t.beach, 0) - 3 && this.unload(t)) { t.mission = 'return'; this.order([t.id], { type: 'move', ...northDock }); }
      else if (!t.order) this.order([t.id], { type: 'move', x: t.beach, y: coast(t.beach, 0) - 2 });
    } else if (t.mission === 'return' && distance(t, northDock) < 2) { t.mission = null; }
  }
}
