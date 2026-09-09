import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, TYPES, SIZE, STARTS, findPath, coast, distance } from '../src/engine.js';

const isolated = () => { const g = new Game(); g.ai.nextThink = Infinity; return g; };
const advance = (g, seconds) => { for (let i = 0; i < seconds * 10 && !g.ended; i++) g.step(.1); };
const queuePlace = (g, type, x, y) => { assert.equal(g.queue(type), true); advance(g, TYPES[type].time + .2); assert.ok(g.place(type, 0, x, y)); };

test('opposing shores and island cannot be reached by land; ships can sail around island', () => {
  const g = isolated();
  assert.equal(findPath(g, STARTS[0], STARTS[1], 'land'), null);
  assert.equal(findPath(g, STARTS[0], { x: 32, y: 32 }, 'land'), null);
  const path = findPath(g, { x: 32, y: 22 }, { x: 32, y: 43 }, 'water');
  assert.ok(path?.length > 20);
  for (const p of path) assert.equal(g.map.tiles[p.y * SIZE + p.x], 0);
});

test('MCV deployment, prerequisites, construction payment, completion and power', () => {
  const g = isolated(); assert.match(g.canBuild('power', 0), /Deploy/);
  assert.ok(g.deploy(g.owned(0, 'mcv')[0]));
  assert.equal(g.canBuild('refinery', 0), 'Requires Power plant');
  const before = g.players[0].credits;
  assert.ok(g.queue('power')); assert.equal(g.players[0].credits, before - TYPES.power.cost);
  assert.equal(g.place('power', 0, 28, 54), false);
  advance(g, 21); assert.ok(g.place('power', 0, 28, 54));
  assert.equal(g.players[0].generated, 170);
  assert.equal(g.placementError('power', 0, 24, 54), 'Needs clear, flat ground.');
  assert.match(g.placementError('power', 0, 50, 60), /within 8/);
});

test('cancellation refunds costs and low power reduces production to 40%', () => {
  const g = isolated(); g.deploy(g.owned(0, 'mcv')[0]); g.spawn('power', 0, 28, 54); g.spawn('barracks', 0, 24, 50);
  const before = g.players[0].credits; g.queue('infantry'); advance(g, 1); g.cancelQueue('infantry'); assert.equal(g.players[0].credits, before);
  g.owned(0, 'power')[0].hp = 0; g.spawn('factory', 0, 30, 50); g.cleanup(); assert.equal(g.players[0].lowPower, true);
  g.queue('infantry'); advance(g, 5); assert.ok(Math.abs(g.players[0].queues.infantry[0].progress - 2) < .01);
});

test('refinery includes a miner which harvests and delivers reachable ore', () => {
  const g = isolated(); g.deploy(g.owned(0, 'mcv')[0]); g.spawn('power', 0, 28, 54);
  queuePlace(g, 'refinery', 20, 51);
  assert.equal(g.owned(0, 'miner').length, 1);
  const before = g.players[0].credits; advance(g, 130);
  assert.ok(g.players[0].credits > before); assert.ok(g.stats.mined[0] >= 360);
  const i = g.map.oreMax.findIndex(v => v > 0); g.map.ore[i] = 0; advance(g, 10); assert.ok(g.map.ore[i] > 1);
});

test('hidden submarines need detection; cruisers hit revealed subs and torpedoes cannot hit land', () => {
  const g = isolated(), sub = g.spawn('sub', 0, 15, 32), cruiser = g.spawn('cruiser', 1, 20, 32), destroyer = g.spawn('destroyer', 1, 40, 32);
  assert.equal(g.visible(sub, 1), false); assert.equal(g.canAttack(cruiser, sub), false);
  destroyer.x = 22; destroyer.y = 32; assert.equal(g.visible(sub, 1), true); assert.equal(g.canAttack(cruiser, sub), true);
  const building = g.spawn('power', 1, 15, 10); assert.equal(g.canAttack(sub, building), false);
  destroyer.x = 50; sub.revealedUntil = g.time + 3; assert.equal(g.visible(sub, 1), true);
});

test('cruisers cannot hit beyond range; combat can destroy structures', () => {
  const g = isolated(), ship = g.spawn('cruiser', 0, 15, 22), near = g.spawn('power', 1, 15, 14), far = g.spawn('power', 1, 15, 3);
  g.attack(ship, far, .1, false); assert.equal(g.projectiles.length, 0);
  g.order([ship.id], { type: 'attack', targetId: near.id }); advance(g, 45); assert.equal(g.get(near.id), undefined); assert.equal(far.hp, far.maxHp);
});

test('transports board at beaches, enforce cargo capacity, and unload tanks', () => {
  const g = isolated(), x = 31, y = coast(x, 0), t = g.spawn('transport', 0, x, y - 2);
  const tanks = [0, 1, 2, 3].map(n => g.spawn('tank', 0, x + n * .3, y));
  g.order(tanks.map(e => e.id), { type: 'board', targetId: t.id }); advance(g, 1);
  assert.equal(t.cargo.length, 3); assert.equal(tanks.filter(e => e.embarked).length, 3);
  t.x = 32; t.y = 25; assert.equal(g.unload(t), true); assert.equal(t.cargo.length, 0);
  for (const tank of tanks.slice(0, 3)) { assert.equal(tank.embarked, null); assert.ok(tank.y >= 26 && tank.y <= 29); }
});

test('destroyed transport kills cargo, including the last MCV', () => {
  const g = isolated(), mcv = g.owned(0, 'mcv')[0], t = g.spawn('transport', 0, 31, 44);
  mcv.embarked = t.id; t.cargo.push(mcv.id); t.hp = 0; g.cleanup(); g.checkVictory();
  assert.equal(g.get(mcv.id), undefined); assert.equal(g.winner, 1);
});

test('undeployed or embarked MCV prevents defeat until destroyed', () => {
  const g = isolated(); g.checkVictory(); assert.equal(g.ended, false);
  const mcv = g.owned(0, 'mcv')[0]; mcv.embarked = 99; g.checkVictory(); assert.equal(g.ended, false);
  mcv.hp = 0; g.cleanup(); g.checkVictory(); assert.equal(g.winner, 1);
});

test('coastal batteries require power; repairs and selling have economic costs', () => {
  const g = isolated(); g.deploy(g.owned(0, 'mcv')[0]); const gun = g.spawn('gun', 0, 31, 48), enemy = g.spawn('cruiser', 1, 31, 42);
  gun.cooldown = 0; g.attack(gun, enemy, .1); assert.equal(g.projectiles.length, 0);
  g.spawn('power', 0, 28, 53); g.attack(gun, enemy, .1); assert.equal(g.projectiles.length, 1);
  const p = g.owned(0, 'power')[0]; p.hp -= 200; p.repair = true; const before = g.players[0].credits; advance(g, 1); assert.ok(p.hp > p.maxHp - 200); assert.ok(g.players[0].credits < before);
  const funds = g.players[0].credits; g.sell(p); assert.equal(g.players[0].credits, funds + TYPES.power.cost / 2);
});

test('AI builds an economy, navy, and armor without free credits', { timeout: 60000 }, () => {
  const g = new Game('normal'); advance(g, 480);
  assert.ok(g.owned(1, 'yard').length); assert.ok(g.owned(1, 'refinery').length); assert.ok(g.owned(1, 'factory').length); assert.ok(g.owned(1, 'shipyard').length);
  assert.ok(g.stats.mined[1] > 1000); assert.ok(g.owned(1, 'destroyer').length); assert.ok(g.owned(1, 'tank').length);
  assert.ok(g.players[1].credits >= 0); assert.equal(g.players[1].lowPower, false);
});

test('an MCV can cross by transport and deploy a functioning island base', () => {
  const g = isolated(); g.deploy(g.owned(0, 'mcv')[0]);
  const y = coast(31, 0), mcv = g.spawn('mcv', 0, 31, y), t = g.spawn('transport', 0, 31, y - 2);
  g.order([mcv.id], { type: 'board', targetId: t.id }); advance(g, 5); assert.equal(mcv.embarked, t.id);
  g.order([t.id], { type: 'move', x: 32, y: 25 }); advance(g, 50); assert.ok(distance(t, { x: 32, y: 25 }) < 1);
  assert.equal(g.unload(t), true);
  let destination;
  for (let y = 27; y < 38 && !destination; y++) for (let x = 26; x < 39; x++) if (!g.placementError('yard', 0, x, y, true)) { destination = { x, y }; break; }
  assert.ok(destination); g.order([mcv.id], { type: 'move', ...destination }); advance(g, 30);
  assert.ok(g.deploy(mcv)); assert.equal(g.owned(0, 'yard').length, 2);
});

test('AI lands tanks and defeats an undefended inland construction yard', () => {
  const g = new Game('normal'), mcv = g.owned(0, 'mcv')[0]; mcv.x = 24; mcv.y = 60;
  const yard = g.deploy(mcv); assert.ok(yard);
  advance(g, 1000); assert.equal(g.ended, true); assert.equal(g.winner, 1);
  assert.ok(g.owned(1, 'tank').some(e => !e.embarked && e.y > 46));
});

test('30-minute AI simulation sustains navy, landings, and a funded island expansion', () => {
  const g = new Game('normal'), yard = g.deploy(g.owned(0, 'mcv')[0]);
  // A durable target keeps the fixture alive long enough to exercise the economy.
  yard.hp = yard.maxHp = 1e9;
  advance(g, 1800);
  assert.ok(g.owned(1, 'cruiser').length >= 3);
  assert.ok(g.owned(1, 'tank').some(e => !e.embarked && e.y > 46));
  assert.ok(g.owned(1, 'yard').some(e => e.y > 24 && e.y < 40));
  assert.ok(g.owned(1, 'refinery').some(e => e.y > 24 && e.y < 40));
  assert.ok(g.players[1].credits >= 0);
  assert.ok(g.stats.mined[1] > 20000);
});
