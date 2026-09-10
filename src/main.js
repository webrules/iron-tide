import { Game, TYPES, CATEGORIES, STARTS, SIZE, nameOf, distance, clamp } from './engine.js';
import { Renderer } from './render.js';
import { BattlefieldAudio } from './audio.js';

const $ = id => document.getElementById(id);
const game = new Game('normal');
const renderer = new Renderer($('battle'), $('minimap'), game);
const sound = new BattlefieldAudio();
let started = false, paused = false, speed = 1, category = 'structures', mode = null, difficulty = 'normal', helpWasPaused = false;
let lastUI = 0, frameTime = performance.now(), accumulator = 0, pointer = null, keyTimes = new Map(), controlGroups = new Map();
let selectionSignature = '', buildSignature = '', resultShown = false;
const keys = new Set(), selected = renderer.selected;
renderer.center(29, 43); renderer.camera.zoom = .8;

function message(text, danger = false) {
  const node = document.createElement('div'); node.className = `toast${danger ? ' danger' : ''}`; node.textContent = text;
  $('message-stack').append(node); while ($('message-stack').children.length > 4) $('message-stack').firstChild.remove();
  setTimeout(() => node.remove(), danger ? 6500 : 4600);
}
function setMode(next) {
  mode = next; renderer.placement = next?.startsWith('place:') ? next.slice(6) : null;
  $('repair-mode').classList.toggle('active', next === 'repair'); $('sell-mode').classList.toggle('active', next === 'sell');
  $('placement-hint').hidden = !next;
  $('placement-hint').textContent = renderer.placement ? `PLACE ${TYPES[renderer.placement].name.toUpperCase()} · ESC CANCEL` : next === 'attack' ? 'CLICK A DESTINATION TO ATTACK-MOVE · ESC CANCEL' : next === 'repair' ? 'CLICK A STRUCTURE TO TOGGLE REPAIR · ESC CANCEL' : 'CLICK A STRUCTURE TO SELL · ESC CANCEL';
  $('battle').style.cursor = next ? 'crosshair' : 'default';
}
function select(ids, additive = false) {
  if (!additive) selected.clear();
  for (const id of ids) { if (additive && selected.has(id)) selected.delete(id); else selected.add(id); }
  if (selected.size) sound.play('select', .06);
  selectionSignature = ''; updateSelection();
}
function selectedUnits() { return [...selected].map(id => game.get(id)).filter(e => e && e.team === 0 && !e.embarked && TYPES[e.type].kind === 'unit'); }
function deploy() { for (const e of selectedUnits()) if (e.type === 'mcv') game.deploy(e); processEvents(); updateUI(true); }
function unload() { for (const e of selectedUnits()) if (e.type === 'transport') game.unload(e); processEvents(); updateUI(true); }
function stop() { game.order(selectedUnits().map(e => e.id), { type: 'stop' }); message('Units holding position.'); }
function guard() { setMode('guard'); }
function togglePause() { if (!started || game.ended) return; paused = !paused; $('pause-banner').hidden = !paused; $('pause').textContent = paused ? '▶' : 'Ⅱ'; $('pause').setAttribute('aria-label', paused ? 'Resume' : 'Pause'); }
function openHelp() { helpWasPaused = paused; if (started && !paused) togglePause(); $('manual').hidden = false; }
function closeHelp() { $('manual').hidden = true; if (!helpWasPaused && paused) togglePause(); }

function issue(screenX, screenY) {
  if (mode) { setMode(null); return; }
  const world = renderer.toWorld(screenX, screenY), hit = renderer.hit(screenX, screenY), units = selectedUnits(), ids = units.map(e => e.id);
  if (!ids.length) {
    const buildings = [...selected].map(id => game.get(id)).filter(e => e?.team === 0 && ['yard', 'barracks', 'factory', 'shipyard'].includes(e.type));
    for (const e of buildings) e.rally = { x: clamp(Math.round(world.x), 0, SIZE - 1), y: clamp(Math.round(world.y), 0, SIZE - 1) };
    if (buildings.length) message('Rally point set.'); return;
  }
  let count = 0;
  if (hit?.team === 1) {
    const attackers = units.filter(e => game.canAttack(e, hit));
    count = game.order(attackers.map(e => e.id), { type: 'attack', targetId: hit.id });
    if (!count) message('Selected units cannot attack that target.');
  } else if (hit?.team === 0 && hit.type === 'transport') {
    count = game.order(ids.filter(id => id !== hit.id), { type: 'board', targetId: hit.id });
    if (count) message('Boarding transport. Move it close to the beach.');
  } else {
    const tx = Math.round(world.x), ty = Math.round(world.y), i = ty * SIZE + tx;
    if (game.inside(tx, ty) && game.map.oreMax[i] > 0 && units.every(e => e.type === 'miner')) count = game.order(ids, { type: 'harvest', phase: 'seek', oreIndex: i });
    else count = game.order(ids, { type: 'move', x: world.x, y: world.y });
    if (!count) message('That destination is not accessible to these units.');
  }
  if (count) { sound.play('order', .065); renderer.marker = { x: world.x, y: world.y, until: performance.now() + 800, attack: hit?.team === 1 }; }
}

function updateBuildList(force = false) {
  const player = game.players[0], lane = player.queues[category];
  const signature = `${category}:${game.structures(0).map(e => e.type).sort().join(',')}:${lane.map(q => `${q.type}:${q.progress >= q.total}`).join(',')}`;
  if (force || signature !== buildSignature) {
    buildSignature = signature; $('build-list').replaceChildren();
    for (const [type, def] of Object.entries(TYPES)) {
      if (type === 'yard' || def.category !== category || def.team === 1) continue;
      const button = document.createElement('button'); button.className = 'build-card'; button.dataset.type = type;
      const icon = document.createElement('canvas'); icon.width = 126; icon.height = 94; renderer.atlas.icon(icon, type);
      const info = document.createElement('span'); info.className = 'build-info';
      info.innerHTML = `<strong>${def.short || def.name}</strong><small><span class="cost">₽ ${def.cost.toLocaleString()}</span> &nbsp; ${def.time}s${def.power ? ` &nbsp; ${def.power > 0 ? '+' : ''}${def.power} MW` : ''}</small>`;
      const state = document.createElement('span'); state.className = 'build-state';
      const progress = document.createElement('span'); progress.className = 'build-progress';
      button.append(icon, info, state, progress); button.title = def.description;
      button.addEventListener('click', () => {
        const current = player.queues.structures[0];
        if (current?.type === type && current.progress >= current.total) { setMode(`place:${type}`); return; }
        game.queue(type); processEvents(); updateUI(true);
      });
      $('build-list').append(button);
    }
  }
  for (const button of $('build-list').children) {
    const type = button.dataset.type, err = game.canBuild(type, 0), current = lane.find(q => q.type === type), ready = current && current.progress >= current.total;
    button.classList.toggle('locked', !!err && !ready); button.classList.toggle('ready', !!ready);
    button.querySelector('.build-state').textContent = ready ? 'PLACE ↗' : current ? `${Math.floor(current.progress / current.total * 100)}%` : err?.startsWith('Requires') ? 'LOCKED' : err === 'Deploy an MCV' ? 'LOCKED' : '';
    button.querySelector('.build-progress').style.width = `${current ? current.progress / current.total * 100 : 0}%`;
    button.title = `${TYPES[type].description}${err ? '\n' + err : ''}`;
  }
}

function updateSelection() {
  for (const id of selected) if (!game.get(id) || game.get(id).embarked) selected.delete(id);
  const list = [...selected].map(id => game.get(id)), first = list[0], signature = list.map(e => `${e.id}:${e.cargo.length}`).join(',');
  if (!first) {
    if (selectionSignature !== 'empty') $('selection-panel').innerHTML = '<div class="selection-empty"><span class="crosshair">⌖</span><div>AWAITING ORDERS<small>Select a unit or structure to issue commands.</small></div></div>';
    selectionSignature = 'empty'; return;
  }
  if (selectionSignature !== signature) {
    selectionSignature = signature; const panel = $('selection-panel'); panel.replaceChildren();
    const content = document.createElement('div'); content.className = 'selected-content';
    const portrait = document.createElement('canvas'); portrait.width = 120; portrait.height = 120; portrait.className = 'selected-portrait'; renderer.atlas.icon(portrait, first.type, first.team);
    const info = document.createElement('div'); info.className = 'selected-info'; info.innerHTML = `<strong>${list.length > 1 ? `${list.length} units selected` : nameOf(first)}</strong><small id="selected-detail"></small><div class="health-track"><div id="selected-health"></div></div>`;
    const actions = document.createElement('div'); actions.className = 'selection-actions';
    const action = (label, cb, title) => { const b = document.createElement('button'); b.textContent = label; b.title = title || label; b.addEventListener('click', cb); actions.append(b); };
    if (first.team === 0) {
      if (list.some(e => e.type === 'mcv')) action('DEPLOY [D]', deploy);
      if (list.some(e => e.type === 'transport')) action('UNLOAD [U]', unload);
      if (list.some(e => TYPES[e.type].damage && TYPES[e.type].kind === 'unit')) action('ATTACK [A]', () => setMode('attack'));
      if (list.some(e => TYPES[e.type].damage && TYPES[e.type].kind === 'unit')) action('GUARD [G]', guard, 'Guard a location and engage enemies in sight');
      if (TYPES[first.type].kind === 'building') { action('REPAIR [R]', () => { first.repair = !first.repair; message(first.repair ? 'Repair crews dispatched.' : 'Repairs stopped.'); }); action('SELL [X]', () => { game.sell(first); updateUI(true); }); }
      else action('STOP [S]', stop);
    }
    content.append(portrait, info, actions); panel.append(content);
  }
  const hp = list.reduce((n, e) => n + e.hp, 0), max = list.reduce((n, e) => n + e.maxHp, 0);
  $('selected-health').style.width = `${hp / max * 100}%`;
  const def = TYPES[first.type];
  $('selected-detail').textContent = list.length > 1 ? `${Math.round(hp)} / ${max} HP · ${list.filter(e => TYPES[e.type].damage).length} COMBAT UNITS` : first.type === 'miner' ? `${Math.round(first.ore)} / 360 ORE · ${first.order?.phase?.toUpperCase() || 'IDLE'}` : first.type === 'transport' ? `${Math.round(first.hp)} HP · ${first.cargo.reduce((n, id) => n + TYPES[game.get(id).type].cargoSize, 0)} / 6 CARGO` : `${Math.round(first.hp)} / ${first.maxHp} HP${def.range ? ` · RANGE ${def.range}` : ''}${first.type === 'sub' ? ' · SONAR 5.5' : ''}`;
}

function updateUI(force = false) {
  const p = game.players[0];
  $('credits').textContent = `₽ ${Math.floor(p.credits).toLocaleString()}`;
  $('power').innerHTML = `${p.used} / ${p.generated} <span>MW</span>`; $('power').classList.toggle('low', p.lowPower);
  $('time').textContent = `${Math.floor(game.time / 60).toString().padStart(2, '0')}:${Math.floor(game.time % 60).toString().padStart(2, '0')}`;
  $('unit-count').textContent = `${game.units(0).length} UNITS · ${game.structures(0).length} STRUCTURES`;
  $('mission-progress').textContent = !game.owned(0, 'yard').length ? 'Deploy your MCV to establish a base.' : !game.owned(0, 'power').length ? 'Build a power plant to begin production.' : !game.owned(0, 'refinery').length ? 'Build a refinery to fund the war effort.' : !game.owned(0, 'shipyard').length ? 'Establish a shipyard in coastal water.' : `${game.structures(1).length} enemy structures · ${game.owned(1, 'mcv').length} enemy MCVs remaining`;
  $('intel').textContent = p.lowPower ? 'LOW POWER · PRODUCTION AT 40%' : 'INTELLIGENCE LINK ESTABLISHED';
  updateBuildList(force); updateSelection();
  const queueSignature = CATEGORIES.map(c => `${c}:${p.queues[c].map(q => q.type).join(',')}`).join('|');
  if ($('queue-list').dataset.signature !== queueSignature) {
    $('queue-list').dataset.signature = queueSignature; $('queue-list').replaceChildren();
    for (const cat of CATEGORIES) if (p.queues[cat].length) {
      const node = document.createElement('div'); node.className = 'queue-item'; node.dataset.category = cat; node.title = 'Click to cancel the first order and refund its cost.';
      node.innerHTML = '<div class="queue-label"><span></span><span class="queue-time"></span><span class="cancel">✕</span></div><div class="health-track"><div></div></div>';
      node.addEventListener('click', () => { game.cancelQueue(cat); if (cat === 'structures') setMode(null); processEvents(); updateUI(true); }); $('queue-list').append(node);
    }
    if (!$('queue-list').children.length) $('queue-list').innerHTML = '<p class="muted">No production orders.</p>';
  }
  let queueCount = 0;
  for (const cat of CATEGORIES) { const q = p.queues[cat]; queueCount += q.length; if (!q.length) continue; const node = $('queue-list').querySelector(`[data-category="${cat}"]`); if (!node) continue; node.querySelector('.queue-label span').textContent = `${TYPES[q[0].type].short || TYPES[q[0].type].name}${q.length > 1 ? ` +${q.length - 1}` : ''}`; node.querySelector('.queue-time').textContent = q[0].progress >= q[0].total ? 'READY' : `${Math.ceil((q[0].total - q[0].progress) / (p.lowPower ? .4 : 1))}s`; node.querySelector('.health-track div').style.width = `${q[0].progress / q[0].total * 100}%`; }
  $('queue-count').textContent = queueCount;
}

function processEvents() {
  for (const event of game.events.splice(0)) {
    if (event.kind === 'message') message(event.message, event.danger);
    else if (event.kind === 'sound') {
      if (event.x === undefined) sound.play(event.sound, .07);
      else if (renderer.visibleScreen(event.x, event.y, 0)) sound.play(event.sound, .025);
    } else if (event.kind === 'deployed') select([event.id]);
    else if (event.kind === 'end') showResult();
  }
}
function showResult() {
  if (resultShown) return; resultShown = true; setMode(null);
  $('result-title').textContent = game.winner === 0 ? 'VICTORY' : game.winner === -1 ? 'STALEMATE' : 'DEFEAT';
  $('result-description').textContent = game.winner === 0 ? 'The Allied command has fallen. The Coldwater Strait is ours.' : game.winner === -1 ? 'Both commands were destroyed. Neither side controls the strait.' : 'Our last foothold is lost. The fleet will remember this coast.';
  $('result-stats').innerHTML = `<div><strong>${$('time').textContent}</strong>ELAPSED</div><div><strong>${game.stats.destroyed[0]}</strong>DESTROYED</div><div><strong>${game.stats.mined[0].toLocaleString()}</strong>ORE REFINED</div>`;
  $('result').hidden = false;
}

for (const b of document.querySelectorAll('[data-difficulty]')) b.addEventListener('click', () => { difficulty = b.dataset.difficulty; document.querySelectorAll('[data-difficulty]').forEach(n => n.classList.toggle('active', n === b)); });
$('start').addEventListener('click', () => {
  game.difficulty = difficulty; game.ai.nextAttack = ({ easy: 600, normal: 360, hard: 230 })[difficulty];
  started = true; $('briefing').hidden = true; $('difficulty-label').textContent = difficulty.toUpperCase(); sound.unlock(); sound.play('ready', .09);
  renderer.center(24, 52); renderer.camera.zoom = .95; select([game.owned(0, 'mcv')[0].id]);
  message('Welcome, commander. Deploy your MCV with D to establish the base.'); $('battle').focus(); frameTime = performance.now();
});
for (const b of document.querySelectorAll('[data-tab]')) b.addEventListener('click', () => { category = b.dataset.tab; document.querySelectorAll('[data-tab]').forEach(n => n.classList.toggle('active', n === b)); updateBuildList(true); });
$('repair-mode').addEventListener('click', () => setMode(mode === 'repair' ? null : 'repair'));
$('sell-mode').addEventListener('click', () => setMode(mode === 'sell' ? null : 'sell'));
$('pause').addEventListener('click', togglePause);
$('speed').addEventListener('click', () => { speed = speed === 1 ? 2 : speed === 2 ? .5 : 1; $('speed').textContent = `${speed === .5 ? '½' : speed}×`; });
$('sound').addEventListener('click', () => { sound.unlock(); sound.enabled = !sound.enabled; $('sound').classList.toggle('muted', !sound.enabled); $('sound').setAttribute('aria-label', sound.enabled ? 'Mute sound' : 'Enable sound'); });
$('help').addEventListener('click', openHelp); $('close-help').addEventListener('click', closeHelp); $('resume-help').addEventListener('click', closeHelp);
$('restart').addEventListener('click', () => window.location.reload()); $('inspect').addEventListener('click', () => { $('result').hidden = true; });

const battle = $('battle');
const touches = new Map();
const gesture = () => {
  const [a, b] = [...touches.values()];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) };
};
let pinch = null;
const touchControls = document.createElement('nav');
touchControls.className = 'touch-controls';
touchControls.setAttribute('aria-label', 'Touch controls');
touchControls.innerHTML = '<button id="zoom-out" aria-label="Zoom out">−</button><button id="zoom-in" aria-label="Zoom in">+</button><button id="touch-select">SELECT AREA</button><button id="touch-order">ORDER</button><button id="touch-guard">GUARD</button><button id="touch-cancel">CANCEL</button><button id="toggle-build" aria-expanded="false" aria-controls="sidebar">BUILD</button>';
$('viewport').append(touchControls);
for (const [id, factor] of [['zoom-out', 1 / 1.2], ['zoom-in', 1.2]]) $(id).addEventListener('click', () => renderer.zoomAt(factor, renderer.width / 2, renderer.height / 2));
$('touch-order').addEventListener('click', () => { setMode('order'); $('placement-hint').textContent = 'TAP A DESTINATION, ENEMY, OR TRANSPORT'; });
$('touch-guard').addEventListener('click', () => { if (selectedUnits().length) guard(); else message('Select combat units first.'); });
$('touch-select').addEventListener('click', () => { setMode('select-area'); $('placement-hint').textContent = 'DRAG A RECTANGLE TO SELECT UNITS · ESC CANCEL'; });
$('touch-cancel').addEventListener('click', () => setMode(null));
$('toggle-build').addEventListener('click', () => {
  const open = $('app').classList.toggle('build-open');
  $('toggle-build').setAttribute('aria-expanded', String(open));
  $('toggle-build').textContent = open ? 'CLOSE' : 'BUILD';
});
battle.addEventListener('contextmenu', e => e.preventDefault());
battle.addEventListener('pointerdown', e => {
  if (!started) return; sound.unlock(); battle.focus();
  const rect = battle.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
  if (e.pointerType === 'touch') {
    touches.set(e.pointerId, { x, y });
    battle.setPointerCapture(e.pointerId);
    if (touches.size > 1) { pinch = gesture(); if (pointer) pointer.dragged = true; renderer.selectionBox = null; return; }
  }
  if (pointer) return;
  if (e.button === 2) { if (!game.ended) issue(x, y); return; }
    pointer = { id: e.pointerId, touch: e.pointerType === 'touch', x, y, lastX: x, lastY: y, button: e.button, dragged: false }; battle.setPointerCapture(e.pointerId);
});
battle.addEventListener('pointermove', e => {
  const rect = battle.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
  renderer.mouse = renderer.toWorld(x, y); renderer.hover = renderer.hit(x, y);
  if (touches.has(e.pointerId)) {
    touches.set(e.pointerId, { x, y });
    if (touches.size > 1) {
      const next = gesture();
      if (pinch) {
        renderer.pan(pinch.x - next.x, pinch.y - next.y);
        if (pinch.distance > 0 && next.distance > 0) renderer.zoomAt(next.distance / pinch.distance, next.x, next.y);
      }
      pinch = next; return;
    }
  }
  if (!pointer || pointer.id !== e.pointerId) return;
  if (pointer.touch && mode === 'select-area') {
    if (Math.hypot(x - pointer.x, y - pointer.y) > 8) { pointer.dragged = true; renderer.selectionBox = { x: Math.min(x, pointer.x), y: Math.min(y, pointer.y), w: Math.abs(x - pointer.x), h: Math.abs(y - pointer.y) }; }
  } else if (pointer.touch) {
    if (!pointer.dragged && Math.hypot(x - pointer.x, y - pointer.y) <= 8) return;
    pointer.dragged = true;
    renderer.pan(pointer.lastX - x, pointer.lastY - y);
  } else if (pointer.button === 1) renderer.pan(pointer.lastX - x, pointer.lastY - y);
  else if (pointer.button === 0 && !mode && Math.hypot(x - pointer.x, y - pointer.y) > 5) { pointer.dragged = true; renderer.selectionBox = { x: Math.min(x, pointer.x), y: Math.min(y, pointer.y), w: Math.abs(x - pointer.x), h: Math.abs(y - pointer.y) }; }
  pointer.lastX = x; pointer.lastY = y;
});
battle.addEventListener('pointerup', e => {
  if (touches.size > 1 && touches.has(e.pointerId)) { releaseTouch(e); return; }
  touches.delete(e.pointerId);
  if (!pointer || pointer.id !== e.pointerId || pointer.button !== e.button) return;
  const rect = battle.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top, world = renderer.toWorld(x, y), hit = renderer.hit(x, y);
  if (pointer.button === 0 && pointer.touch && pointer.dragged && mode === 'select-area') {
    const box = renderer.selectionBox, ids = game.units(0).filter(u => !u.embarked && (() => { const p = renderer.toScreen(u.x, u.y); return p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h; })()).map(u => u.id); select(ids); setMode(null);
  } else if (pointer.button === 0 && !(pointer.touch && pointer.dragged)) {
    if (mode && !game.ended) {
      if (mode === 'order') { setMode(null); issue(x, y); }
      else if (renderer.placement) { if (game.place(renderer.placement, 0, world.x, world.y)) setMode(null); processEvents(); updateUI(true); }
      else if (mode === 'attack') { game.order(selectedUnits().map(u => u.id), { type: 'attackMove', x: world.x, y: world.y }); renderer.marker = { ...world, attack: true, until: performance.now() + 800 }; sound.play('order', .06); setMode(null); }
      else if (mode === 'guard') { game.order(selectedUnits().map(u => u.id), { type: 'guard', x: world.x, y: world.y, radius: 6 }); renderer.marker = { ...world, until: performance.now() + 900 }; sound.play('order', .06); setMode(null); }
      else if (hit?.team === 0 && TYPES[hit.type].kind === 'building') { if (mode === 'sell') game.sell(hit); else { hit.repair = !hit.repair; message(hit.repair ? 'Repair crews dispatched.' : 'Repairs stopped.'); } updateUI(true); }
    } else if (pointer.dragged && renderer.selectionBox) {
      const box = renderer.selectionBox, ids = game.units(0).filter(u => { if (u.embarked) return false; const p = renderer.toScreen(u.x, u.y); return p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h; }).map(u => u.id);
      select(ids, e.shiftKey);
    } else select(hit ? [hit.id] : [], e.shiftKey);
  }
  pointer = null; renderer.selectionBox = null;
});
function releaseTouch(e) {
  touches.delete(e.pointerId);
  pinch = touches.size > 1 ? gesture() : null;
  const remaining = touches.entries().next().value;
  pointer = remaining ? { id: remaining[0], touch: true, ...remaining[1], lastX: remaining[1].x, lastY: remaining[1].y, button: 0, dragged: true } : null;
  renderer.selectionBox = null;
}
function cancelPointer(e) {
  if (touches.has(e.pointerId)) releaseTouch(e);
  else if (pointer?.id === e.pointerId) { pointer = null; renderer.selectionBox = null; }
}
battle.addEventListener('pointercancel', cancelPointer);
battle.addEventListener('lostpointercapture', cancelPointer);
battle.addEventListener('pointerleave', () => { renderer.hover = null; });
battle.addEventListener('wheel', e => { e.preventDefault(); const r = battle.getBoundingClientRect(); renderer.zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
let miniDrag = false;
function miniNavigate(e) { const r = $('minimap').getBoundingClientRect(); renderer.center(clamp((e.clientX - r.left) / r.width * SIZE, 0, SIZE - 1), clamp((e.clientY - r.top) / r.height * SIZE, 0, SIZE - 1)); }
$('minimap').addEventListener('pointerdown', e => { miniDrag = true; $('minimap').setPointerCapture(e.pointerId); miniNavigate(e); });
$('minimap').addEventListener('pointermove', e => { if (miniDrag) miniNavigate(e); });
$('minimap').addEventListener('pointerup', () => { miniDrag = false; });
$('minimap').addEventListener('pointercancel', () => { miniDrag = false; });
$('minimap').addEventListener('lostpointercapture', () => { miniDrag = false; });

if (navigator.maxTouchPoints > 0) $('order-status').textContent = 'DRAG TO PAN · PINCH TO ZOOM · TAP TO SELECT';

window.addEventListener('keydown', e => {
  if (!started || !['BUTTON', 'CANVAS', 'BODY'].includes(document.activeElement.tagName)) return;
  const k = e.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'home'].includes(k)) e.preventDefault();
  if (e.repeat) return;
  if (!$('manual').hidden) { if (k === 'escape' || k === '?') closeHelp(); return; }
  keys.add(k); keyTimes.set(k, performance.now());
  if (k === 'escape') { setMode(null); select([]); }
  else if (k === ' ') togglePause();
  else if (k === '?') openHelp();
  else if (k === 'home') { const home = game.owned(0, 'yard')[0] || game.owned(0, 'mcv')[0] || STARTS[0]; renderer.center(home.x, home.y); }
  else if (/^[1-9]$/.test(k)) {
    if (e.ctrlKey) { e.preventDefault(); controlGroups.set(k, [...selected]); message(`Control group ${k} assigned.`); }
    else select((controlGroups.get(k) || []).filter(id => game.get(id)));
  } else if (!game.ended) {
    if (k === 'u') unload(); else if (k === 'r') setMode(mode === 'repair' ? null : 'repair'); else if (k === 'x') setMode(mode === 'sell' ? null : 'sell');
  }
});
window.addEventListener('keyup', e => {
  const k = e.key.toLowerCase(), tap = performance.now() - (keyTimes.get(k) || 0) < 200; keys.delete(k); keyTimes.delete(k);
  if (!started || game.ended || !$('manual').hidden || !tap) return;
  if (k === 'd' && selectedUnits().some(u => u.type === 'mcv')) deploy();
  else if (k === 'a' && selectedUnits().some(u => TYPES[u.type].damage)) setMode('attack');
  else if (k === 'g' && selectedUnits().some(u => TYPES[u.type].damage)) guard();
  else if (k === 's' && selectedUnits().length) stop();
});
window.addEventListener('blur', () => { keys.clear(); keyTimes.clear(); touches.clear(); pinch = null; pointer = null; renderer.selectionBox = null; });
document.addEventListener('visibilitychange', () => { if (document.hidden && started && !paused && !game.ended) { togglePause(); message('Battle paused while this tab is in the background.'); } });
window.addEventListener('resize', () => renderer.resize());

function frame(now) {
  const dt = Math.min((now - frameTime) / 1000, .1); frameTime = now;
  if (started && $('manual').hidden) {
    const held = k => keys.has(k) && (k.startsWith('arrow') || now - (keyTimes.get(k) || 0) > 200);
    const dx = (held('arrowright') || held('d') ? 1 : 0) - (held('arrowleft') || held('a') ? 1 : 0), dy = (held('arrowdown') || held('s') ? 1 : 0) - (held('arrowup') || held('w') ? 1 : 0);
    if (dx || dy) renderer.pan(dx * dt * 650, dy * dt * 650);
  }
  if (started && !paused && !game.ended) {
    accumulator += dt * speed;
    while (accumulator >= .1) { game.step(.1); accumulator -= .1; }
    processEvents();
  }
  renderer.render(now);
  if (now - lastUI > 180) { updateUI(); lastUI = now; }
  requestAnimationFrame(frame);
}
updateUI(true); requestAnimationFrame(frame);

// Read-only inspection and explicit debug stepping are available for local testing.
// No server, account, or network connection participates in a match.
window.ironTide = { game, renderer, get started() { return started; }, get paused() { return paused; }, get speed() { return speed; }, select, updateUI, processEvents };
