# Iron Tide — Operation Coldwater

A self-contained, single-player browser RTS inspired by Red Alert 2 naval combat. Command the Soviets against Allied AI on one fixed isometric battlefield. Terrain uses a bundled AI-generated photographic material atlas; units and sounds are generated in code. The game loads its files from the site itself and requires no accounts or third-party services.

## Play

Use the installed Node.js runtime:

```sh
cd /home/webrules/Work/iron-tide
npm start
```

Open **http://127.0.0.1:4173** in a desktop browser. The server listens only on your machine. Set `PORT` to use another port. A running match lives entirely in the browser; refreshing starts over.

Choose Easy, Normal, or Hard, then begin the operation. Your MCV starts selected. Tap **D** to deploy it. Build **Power plant → Ore refinery → Barracks → War factory**, then place a **Naval shipyard** in the water beside one of your sandy beaches. Each refinery includes one miner, which automatically gathers and deposits ore.

## Controls

On iPhone, iPad, and other touch screens, drag with one finger to pan and pinch with two fingers to zoom. The + and − buttons also zoom. Tap to select units; tap ORDER, then a destination, enemy, or transport to command them. Tap CANCEL to leave a command or placement mode. On phones, BUILD opens or closes production. Tap a completed building card, close production, then tap the map to place it. The minimap also supports tap and drag navigation. Mouse and keyboard controls remain available on desktop.

| Input | Action |
| --- | --- |
| Left-click / drag | Select one unit or a group |
| Shift + selection | Add or remove units |
| Right-click ground / enemy | Move / attack |
| Tap A, then left-click | Attack-move |
| Tap D | Deploy selected MCV |
| Tap S | Stop selected units |
| Right-click friendly transport with land units selected | Board at a beach |
| U | Unload selected transports at a beach |
| Ctrl + 1–9 / 1–9 | Assign / recall a control group |
| Arrow keys, or hold WASD | Pan camera |
| Middle mouse drag | Pan camera |
| Mouse wheel | Zoom toward pointer |
| Click or drag minimap | Move camera |
| Home | Center on your construction yard or MCV |
| Space | Pause / resume |
| R / X | Repair / sell mode; click a structure |
| Right-click with a production building selected | Set rally point |
| Escape | Cancel current mode and deselect |
| ? | Field manual |

Tap A, D, or S for unit commands; hold them for more than 200 ms to pan the camera. Click a completed structure’s production card to place it. Click a queue entry’s × to cancel the first order and receive its cost back. Low power slows production to 40% and disables coastal batteries. Pausing still permits planning and giving orders. Switching to another browser tab automatically pauses the battle.

## Battle rules

- The map is visible from the start, except undetected enemy submarines. Soviet submarines detect within 5.5 tiles; Allied destroyers detect within 9. Firing exposes a submarine for 3 seconds. Cruisers can hit detected subs.
- Soviet heavy tanks hit harder; Allied medium tanks are faster. Both factions have infantry, miners, MCVs, cruisers, and transports. Soviets have attack submarines; Allies have escort destroyers.
- Cruisers bombard land and sea within 11.5 tiles. Coastal guns have 10.5-tile range. Deep inland structures need a ground assault.
- Three stretches of sandy beach per coast permit landings. Cliff sections cannot be crossed. The central island offers additional slowly regenerating ore.
- Transports carry 6 slots: infantry uses 1; tanks/miners 2; MCVs 3. Land units board by approaching a transport beside a beach. Destroying a transport destroys its cargo.
- A second MCV can be built in your war factory, transported to the island, and deployed on clear ground. Construction extends from your existing structures, within 8.5 tiles. Ore fields cannot be built over.
- Victory requires the destruction of all enemy buildings and surviving MCVs, including embarked MCVs. Tanks and other surviving units do not prolong a defeated faction.
- Easy gives more preparation time and uses smaller forces. Normal coordinates regular fleet attacks and landings. Hard attacks sooner, fields more troops, varies landing beaches, and adds escorts in response to detected submarines. All use the same unit stats, starting funds, mining, build costs, and production times.
- Normal and Hard may expand to the central island when their economy supports it. There are no free AI units or resources.
- Target length is about 30 minutes at 1×, with no deadline. Actual duration depends on play. Speeds are ½×, 1×, and 2×. There is no saving/loading, air combat, capturing, or superweapon.

## Implementation and verification

- `src/engine.js`: deterministic simulation, terrain, A* pathfinding, economy, combat, production, transport logistics, and AI.
- `src/art.js`: photographic terrain blending, depth shading, and procedural fallback.
- `assets/terrain-atlas.png`: bundled AI-generated grass, sand, rock, and ocean materials, baked into the map once after loading.
- `assets/unit-materials.png`: bundled photographic armor, steel, and fabric materials softly applied to unit sprites.
- `src/sprite-models.js`: detailed building and unit models, faction insignia, armor, railings, animated treads, flags, and cranes.
- `src/sprite-raster.js` and `src/sprites.js`: depth-buffered lighting, shadows, edge highlights, and cached directional sprites.
- `src/render.js`: isometric Canvas renderer, selection, effects, range visualization, minimap, and camera.
- `src/main.js`: interface, input, animation loop, and match flow.
- `src/audio.js`: synthesized command acknowledgments and weapon effects.

Run simulation tests with `npm test`. They exercise map connectivity, prerequisites and payment, low power, mining, submarine detection, firing range, cargo capacity, MCV survival, repairs, and AI production.

`tests/browser.mjs` is an optional integration test using Chromium’s local DevTools protocol (port 9222). It checks real keyboard/mouse interactions, production placement, transport loading/unloading, control groups, pause/speed/manual behavior, desktop layout, rendering errors, and the victory screen. It writes screenshots to `/tmp/iron-tide-*.png`. It requires the game server and a disposable Chromium test profile; never connect it to a personal browsing session.

This is an original browser implementation, not an official Red Alert release or an import of its engine/assets. The match is playable end-to-end; visual polish and the approximate 30-minute balance can be refined through playtesting.
