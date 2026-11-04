# Game D

A minimal game starter built with **Excalibur.js 0.32**, TypeScript, Vite and pnpm.
Everything is client-side; there is no backend. The scene is intentionally tiny —
a square bounces around a ground strip — so you can swap in your own game.

## Run it

```
pnpm install
pnpm dev
```

Then open the printed local URL.

```
pnpm test       # headless unit tests
pnpm typecheck  # strict TypeScript check
pnpm build      # static production build in dist/
pnpm preview    # serve the built output
```

## Layout

```
src/
  game/
    config.ts              all tunables
    scenes/StarterScene.ts the demo scene
  main.ts                  engine bootstrap
  style.css
tests/                     headless Vitest tests
```

## Stack

| Tool | Version |
| --- | --- |
| Excalibur.js | 0.32.0 |
| TypeScript | 7.0.2 |
| Vite | 8.3.4 |
| Vitest | 5.0.5 |
| pnpm | 12.14.0 |

## Next

Replace `StarterScene` with your own scene, add gameplay under `src/game/`,
and keep the pure logic in engine-free modules so it stays easy to unit test.
