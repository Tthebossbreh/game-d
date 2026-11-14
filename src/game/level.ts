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
  /** Per-cell horizontal flip mask for the tile layers (1 = mirror the tile). */
  flipX: number[][];
  columns: { main: number; front: number };
}

/** Fallback used only if a level has no EntityPlayer in its entity list. */
const DEFAULT_PLAYER_SPAWN = { x: 296, y: 44 * TILE - PLAYER.height / 2 } as const;

const KIND_BY_ENTITY: Record<string, SpawnKind> = {
  EntityPlayer: 'player',
  EntityFish: 'fish',
  EntityFishBig: 'fish-big',
  EntityFishDart: 'fish-dart',
  EntityMine: 'mine',
  EntityMineSmall: 'mine-small',
  EntityMineBig: 'mine-big',
  EntityLevelexit: 'exit',
  EntityPickup: 'pickup',
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

  const spawns: Spawn[] = [];

  for (const entity of raw.entities) {
    const kind = KIND_BY_ENTITY[entity.type];
    if (!kind) {
      // EntityVoid markers and other authoring-only types are ignored.
      continue;
    }
    const { w, h } = entitySize(kind);
    spawns.push({ kind, x: entity.x + w / 2, y: entity.y + h / 2 });
  }

  if (!spawns.some((s) => s.kind === 'player')) {
    spawns.push({ kind: 'player', x: DEFAULT_PLAYER_SPAWN.x, y: DEFAULT_PLAYER_SPAWN.y });
  }

  return {
    tile: raw.tilesize,
    width,
    height,
    pixelWidth: width * raw.tilesize,
    pixelHeight: height * raw.tilesize,
    solids: buildSolids(collision, width, height, raw.tilesize),
    spawns,
    layers: { main: raw.main as number[][], front: raw.front as number[][] },
    flipX: (raw.flipX ?? []) as number[][],
    columns: { main: raw.tilesets.main.cols, front: raw.tilesets.front.cols },
  };
}

export const LEVEL: LevelData = parseLevel(raw);

export function findSpawn(level: LevelData, kind: SpawnKind): Spawn | undefined {
  return level.spawns.find((s) => s.kind === kind);
}

/** Where the diver starts, taken from the level's EntityPlayer marker. */
export const PLAYER_SPAWN: { x: number; y: number } = findSpawn(LEVEL, 'player') ?? DEFAULT_PLAYER_SPAWN;
