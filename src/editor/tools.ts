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

/** Remove the top-most entity under a world-space point. Returns its type. */
export function deleteEntityAt(
  level: EditableLevel,
  wx: number,
  wy: number,
  sizeOf: (type: string) => Size,
): string | null {
  for (let i = level.entities.length - 1; i >= 0; i--) {
    const entity = level.entities[i];
    if (!entity) {
      continue;
    }
    const size = sizeOf(entity.type);
    if (wx >= entity.x && wx <= entity.x + size.w && wy >= entity.y && wy <= entity.y + size.h) {
      level.entities.splice(i, 1);
      return entity.type;
    }
  }
  return null;
}
