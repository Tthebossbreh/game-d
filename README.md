# Underwater Diving — Cave Platformer

A single-player side-scrolling platformer built with the **Underwater Diving**
asset pack, on an **Excalibur.js 0.32 + TypeScript + Vite + pnpm** stack.

You play a diver descending a flooded cave: run, jump and boost through the
rock, stomp or dash through fish, avoid mines, collect drifting bubbles and
reach the glowing exit on the far right.

![Gameplay](docs/screenshot.png)

## Run it

```
pnpm install
pnpm dev
```

Then open the printed local URL. Enter starts the game.

```
pnpm test       # headless unit tests
pnpm typecheck  # strict TypeScript check
pnpm build      # static production build in dist/
pnpm preview    # serve the built output
```

## Controls

| Action | Keys |
| --- | --- |
| Move | `←` `→` or `A` `D` |
| Jump / swim up (hold) | `Space`, `↑` or `W` |
| Boost (also your attack) | `Shift`, `X` or `Z` |
| Sink faster | `↓` or `S` |
| Confirm | `Enter` |

Holding jump underwater keeps lifting the diver, so the open cave is traversable
in any direction. Boosting into a fish destroys it; so does landing on one.

## Assets

Every runtime asset from the pack is used:

- **Player** — five animation sheets (idle, swim, fast, rush, hurt).
- **Enemies** — `fish`, `fish-big`, `fish-dart`, and `mine` / `mine-small` /
  `mine-big` hazards.
- **FX** — `explosion`, `explosion-small`, `explosion-big`, `enemy-death`,
  `bubbles`.
- **Environment** — `tiles.png` (cave terrain), `props.png` (coral, plants,
  chains), `background.png` and `midground.png` parallax layers.
- **UI** — start-screen art, instruction card and the `04b03` bitmap font
  (auto-decoded into a glyph atlas in `src/game/ui/font.json`).
- **Audio** — two music tracks, three ambient loops and one-shot bubble /
  pickup effects.

The cave level is the pack's original **Level 1** layout: the real collision
bitmap and the `tiles`/`props` tile layers are extracted from the Impact.js
level data into `src/game/levels/level1.json` and rasterised at load time.

> Artwork by **Luis Zuno (@ansimuz)** — public domain, free for personal and
> commercial use. Demo music by **Pascal Belisle**. Fonts by **Bego Somepx**.
> More free assets at <http://www.pixelgameart.org>.

## Layout

```
public/assets/            runtime sprites, tiles, sounds and UI art
src/
  main.ts                 engine bootstrap + scene registration
  game/
    config.ts             all gameplay tunables (engine-free)
    assets.ts             asset paths, loader, sprite-sheet helpers
    level.ts              parses the Impact level into solids + spawns
    levels/level1.json    extracted collision + tile data
    physics/              pure AABB helpers and the fixed-step solver
    player/               PlayerState (pure) + PlayerActor (rendering)
    enemies/              EnemyState (pure) + EnemyActor (rendering)
    entities/             pickups and one-shot FX actors
    render/tilemap.ts     rasterises tile layers to a single sprite
    ui/                   bitmap font, glyph atlas and the HUD
    audio/Sfx.ts          music, ambience and effects
    scenes/               Title, Instructions and Game scenes
tests/                    headless Vitest suite
```

### Design notes

- **Engine-free simulation.** `PlayerState`, `EnemyState`, `physics/` and
  `level.ts` import nothing from Excalibur, so movement, combat and level
  parsing are covered by fast headless tests. The `*Actor` classes only render.
- **Fixed 120 Hz step** for deterministic movement.
- **Real level data.** Rather than re-authoring the cave, the pack's own
  collision grid drives physics and its tile layers are pre-rendered once into
  two sprites (`main` behind the actors, `props` in front).
- **Debug handle.** `window.__diving` exposes the `Engine` for console poking
  (scene changes, camera, actors).

## Next

A room graph with transitions, a ranged tea-thrower analogue, a mini-boss, and
a proper title/credits flow.
