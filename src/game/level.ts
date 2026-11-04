import raw from './levels/level1.json';
import { ENEMY, PLAYER, TILE, type EnemyKind } from './config';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SpawnKind = 'player' | EnemyKind | 'exit' | 'pickup';

export interface Spawn {
  kind: SpawnKind;
  /** Center of the entity in level pixels. */
  x: number;
  y: number;
}

export interface LevelData {
  tile: number;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  solids: Rect[];
  spawns: Spawn[];
  layers: { main: number[][]; front: number[][] };
  columns: { main: number; front: number };
}

/** Where the diver starts: standing on the cave floor near the left wall. */
export const PLAYER_SPAWN = { x: 296, y: 44 * TILE - PLAYER.height / 2 } as const;

/**
 * Level 1 ships with mines and exits but no fish, so the platformer seeds the
 * open water with the three fish archetypes plus a scattering of pickups.
 */
const EXTRA_SPAWNS: Spawn[] = [
  { kind: 'fish', x: 600, y: 300 },
  { kind: 'fish', x: 760, y: 240 },
  { kind: 'fish', x: 520, y: 600 },
  { kind: 'fish', x: 880, y: 560 },
  { kind: 'fish', x: 660, y: 470 },
  { kind: 'fish', x: 420, y: 300 },
  { kind: 'fish-big', x: 360, y: 200 },
  { kind: 'fish-big', x: 980, y: 520 },
  { kind: 'fish-big', x: 252, y: 422 },
  { kind: 'fish-dart', x: 700, y: 380 },
  { kind: 'fish-dart', x: 460, y: 560 },
  { kind: 'fish-dart', x: 1040, y: 440 },
  { kind: 'pickup', x: 500, y: 200 },
  { kind: 'pickup', x: 700, y: 300 },
  { kind: 'pickup', x: 900, y: 300 },
  { kind: 'pickup', x: 600, y: 620 },
  { kind: 'pickup', x: 200, y: 500 },
  { kind: 'pickup', x: 900, y: 620 },
];

const KIND_BY_ENTITY: Record<string, SpawnKind> = {
  EntityPlayer: 'player',
  EntityFish: 'fish',
  EntityFishBig: 'fish-big',
  EntityFishDart: 'fish-dart',
  EntityMine: 'mine',
  EntityMineSmall: 'mine-small',
  EntityMineBig: 'mine-big',
  EntityLevelexit: 'exit',
};

function entitySize(kind: SpawnKind): { w: number; h: number } {
  if (kind === 'player') {
    return { w: PLAYER.width, h: PLAYER.height };
  }
  if (kind === 'exit') {
    return { w: 32, h: 32 };
  }
  if (kind === 'pickup') {
    return { w: 23, h: 40 };
  }
  const size = ENEMY[kind];
  return { w: size.width, h: size.height };
}

/**
 * Collapse each row of the collision bitmap into horizontal runs. A cave wall
 * thousands of tiles wide becomes a few hundred rectangles for the solver.
 */
export function buildSolids(
  collision: number[][],
  width: number,
  height: number,
  tile: number = TILE,
): Rect[] {
  const solids: Rect[] = [];
  for (let y = 0; y < height; y++) {
    const row = collision[y];
    let start = -1;
    for (let x = 0; x <= width; x++) {
      const solid = x < width && (row?.[x] ?? 0) > 0;
      if (solid && start < 0) {
        start = x;
      }
      if (!solid && start >= 0) {
        solids.push({ x: start * tile, y: y * tile, w: (x - start) * tile, h: tile });
        start = -1;
      }
    }
  }
  return solids;
}

export function parseLevel(raw: typeof import('./levels/level1.json')): LevelData {
  const width = raw.width;
  const height = raw.height;
  const collision = raw.collision as number[][];

  const spawns: Spawn[] = [{ kind: 'player', x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y }];

  for (const entity of raw.entities) {
    const kind = KIND_BY_ENTITY[entity.type];
    if (!kind || kind === 'player') {
      // The player spawn is authored separately; EntityVoid markers are ignored.
      continue;
    }
    const { w, h } = entitySize(kind);
    spawns.push({ kind, x: entity.x + w / 2, y: entity.y + h / 2 });
  }

  spawns.push(...EXTRA_SPAWNS);

  return {
    tile: raw.tilesize,
    width,
    height,
    pixelWidth: width * raw.tilesize,
    pixelHeight: height * raw.tilesize,
    solids: buildSolids(collision, width, height, raw.tilesize),
    spawns,
    layers: { main: raw.main as number[][], front: raw.front as number[][] },
    columns: { main: raw.tilesets.main.cols, front: raw.tilesets.front.cols },
  };
}

export const LEVEL: LevelData = parseLevel(raw);

export function findSpawn(level: LevelData, kind: SpawnKind): Spawn | undefined {
  return level.spawns.find((s) => s.kind === kind);
}
