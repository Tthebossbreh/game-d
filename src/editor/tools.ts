/**
 * Pure level-editing operations. These functions mutate a level object and do
 * not touch the DOM, so they can be unit-tested without a browser.
 */

export type LayerName = 'main' | 'front' | 'collision';

export interface EditableEntity {
  type: string;
  x: number;
  y: number;
  [key: string]: unknown;
}

export interface EditableLevel {
  tilesize: number;
  width: number;
  height: number;
  tilesets: { main: { cols: number }; front: { cols: number } };
  collision: number[][];
  main: number[][];
  front: number[][];
  entities: EditableEntity[];
}

export interface Size {
  w: number;
  h: number;
}

export interface StampEntity {
  type: string;
  /** Offset in pixels from the stamp's top-left world corner. */
  dx: number;
  dy: number;
}

/**
 * A reusable block of tiles (plus any entities that were inside the copied
 * area). Stamps always remember the layer they were copied from so their tile
 * ids are drawn against the right tileset.
 */
export interface Stamp {
  width: number;
  height: number;
  /** Row-major tile ids. Collision stamps use 0 = empty / 1 = solid. */
  tiles: number[][];
  entities: StampEntity[];
  layer: LayerName;
}

export interface StampOptions {
  /** Also write empty cells (clears the destination). Defaults to false. */
  overwriteEmpty?: boolean;
  /** Also place the stamp's entities. Defaults to true. */
  entities?: boolean;
  /** Remove any existing player when the stamp contains one. Defaults to true. */
  singlePlayer?: boolean;
}

export function inBounds(level: EditableLevel, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < level.width && y < level.height;
}

/** Return the numeric grid for a layer. Collision stores solid = 1. */
export function layerGrid(level: EditableLevel, layer: LayerName): number[][] {
  if (layer === 'main') {
    return level.main;
  }
  if (layer === 'front') {
    return level.front;
  }
  return level.collision;
}

/** Write a tile id (or solid flag for the collision layer) into the grid. */
export function paintTile(
  level: EditableLevel,
  layer: LayerName,
  x: number,
  y: number,
  tileId: number,
): void {
  if (!inBounds(level, x, y)) {
    return;
  }
  const row = layerGrid(level, layer)[y];
  if (!row) {
    return;
  }
  row[x] = layer === 'collision' ? 1 : tileId;
}

/** Clear a single cell. */
export function eraseTile(level: EditableLevel, layer: LayerName, x: number, y: number): void {
  if (!inBounds(level, x, y)) {
    return;
  }
  const row = layerGrid(level, layer)[y];
  if (row) {
    row[x] = 0;
  }
}

/**
 * Walk a Bresenham line between two tile coordinates. Used for both the line
 * tool and for interpolating a fast brush stroke so it does not leave gaps.
 */
export function forEachLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  fn: (x: number, y: number) => void,
): void {
  let dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    fn(x, y);
    if (x === x1 && y === y1) {
      break;
    }
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** Fill an inclusive rectangle of cells. */
export function paintBox(
  level: EditableLevel,
  layer: LayerName,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  tileId: number,
): void {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      paintTile(level, layer, x, y, tileId);
    }
  }
}

/** Draw a line of cells. */
export function paintLine(
  level: EditableLevel,
  layer: LayerName,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  tileId: number,
): void {
  forEachLine(x0, y0, x1, y1, (x, y) => paintTile(level, layer, x, y, tileId));
}

/** Place an entity centered on a world-space point. */
export function placeEntity(
  level: EditableLevel,
  type: string,
  wx: number,
  wy: number,
  size: Size,
  singlePlayer = false,
): EditableEntity {
  if (singlePlayer && type === 'EntityPlayer') {
    level.entities = level.entities.filter((entity) => entity.type !== 'EntityPlayer');
  }
  const entity: EditableEntity = {
    type,
    x: Math.round(wx - size.w / 2),
    y: Math.round(wy - size.h / 2),
  };
  level.entities.push(entity);
  return entity;
}

/** Top-most entity under a world-space point, or null. */
export function entityAt(
  level: EditableLevel,
  wx: number,
  wy: number,
  sizeOf: (type: string) => Size,
): EditableEntity | null {
  for (let i = level.entities.length - 1; i >= 0; i--) {
    const entity = level.entities[i];
    if (!entity) {
      continue;
    }
    const size = sizeOf(entity.type);
    if (wx >= entity.x && wx <= entity.x + size.w && wy >= entity.y && wy <= entity.y + size.h) {
      return entity;
    }
  }
  return null;
}

/** Remove the top-most entity under a world-space point. Returns its type. */
export function deleteEntityAt(
  level: EditableLevel,
  wx: number,
  wy: number,
  sizeOf: (type: string) => Size,
): string | null {
  const entity = entityAt(level, wx, wy, sizeOf);
  if (!entity) {
    return null;
  }
  level.entities.splice(level.entities.indexOf(entity), 1);
  return entity.type;
}

/** Intersect a tile rectangle with a grid, returning inclusive bounds. */
function clampRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  height: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const minX = Math.max(0, Math.min(x0, x1));
  const minY = Math.max(0, Math.min(y0, y1));
  const maxX = Math.min(width - 1, Math.max(x0, x1));
  const maxY = Math.min(height - 1, Math.max(y0, y1));
  if (minX > maxX || minY > maxY) {
    return null;
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Copy an inclusive rectangle of the level into a reusable stamp. The region is
 * clamped to the level, and entities whose top-left sits inside it come along
 * with relative offsets.
 */
export function captureStamp(
  level: EditableLevel,
  layer: LayerName,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Stamp | null {
  const bounds = clampRect(x0, y0, x1, y1, level.width, level.height);
  if (!bounds) {
    return null;
  }
  const grid = layerGrid(level, layer);
  const tiles: number[][] = [];
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    const row: number[] = [];
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      row.push(grid[y]?.[x] ?? 0);
    }
    tiles.push(row);
  }

  const originX = bounds.minX * level.tilesize;
  const originY = bounds.minY * level.tilesize;
  const regionW = (bounds.maxX - bounds.minX + 1) * level.tilesize;
  const regionH = (bounds.maxY - bounds.minY + 1) * level.tilesize;
  const entities: StampEntity[] = [];
  for (const entity of level.entities) {
    if (
      entity.x >= originX &&
      entity.x < originX + regionW &&
      entity.y >= originY &&
      entity.y < originY + regionH
    ) {
      entities.push({ type: entity.type, dx: entity.x - originX, dy: entity.y - originY });
    }
  }

  return {
    width: bounds.maxX - bounds.minX + 1,
    height: bounds.maxY - bounds.minY + 1,
    tiles,
    entities,
    layer,
  };
}

/** Build a stamp from a rectangular selection in the tile palette. */
export function capturePaletteStamp(
  cols: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  layer: 'main' | 'front',
): Stamp | null {
  const minX = Math.max(0, Math.min(x0, x1));
  const maxX = Math.min(cols - 1, Math.max(x0, x1));
  const minY = Math.max(0, Math.min(y0, y1));
  const maxY = Math.max(y0, y1);
  if (minX > maxX) {
    return null;
  }
  const tiles: number[][] = [];
  for (let y = minY; y <= maxY; y++) {
    const row: number[] = [];
    for (let x = minX; x <= maxX; x++) {
      row.push(y * cols + x + 1);
    }
    tiles.push(row);
  }
  return {
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    tiles,
    entities: [],
    layer,
  };
}

/**
 * Drop a whole stamp with its top-left corner at a tile coordinate. Empty cells
 * are skipped by default so a palette stamp does not erase what is underneath
 * it; pass `overwriteEmpty` to copy the region exactly.
 */
export function applyStamp(
  level: EditableLevel,
  layer: LayerName,
  stamp: Stamp,
  x: number,
  y: number,
  options: StampOptions = {},
): { tiles: number; entities: number } {
  let tiles = 0;
  for (let row = 0; row < stamp.height; row++) {
    for (let col = 0; col < stamp.width; col++) {
      const tileId = stamp.tiles[row]?.[col] ?? 0;
      const tx = x + col;
      const ty = y + row;
      if (!inBounds(level, tx, ty)) {
        continue;
      }
      if (tileId === 0) {
        if (!options.overwriteEmpty) {
          continue;
        }
        eraseTile(level, layer, tx, ty);
      } else {
        paintTile(level, layer, tx, ty, tileId);
      }
      tiles += 1;
    }
  }

  let entities = 0;
  if (options.entities !== false && stamp.entities.length > 0) {
    if (options.singlePlayer !== false && stamp.entities.some((e) => e.type === 'EntityPlayer')) {
      level.entities = level.entities.filter((entity) => entity.type !== 'EntityPlayer');
    }
    const originX = x * level.tilesize;
    const originY = y * level.tilesize;
    for (const entity of stamp.entities) {
      level.entities.push({ type: entity.type, x: originX + entity.dx, y: originY + entity.dy });
      entities += 1;
    }
  }

  return { tiles, entities };
}
