import { describe, expect, it } from 'vitest';
import {
  deleteEntityAt,
  eraseTile,
  forEachLine,
  inBounds,
  paintBox,
  paintLine,
  paintTile,
  placeEntity,
  type EditableLevel,
  type Size,
} from '../src/editor/tools';

function makeLevel(w: number, h: number): EditableLevel {
  const grid = (): number[][] => Array.from({ length: h }, () => Array<number>(w).fill(0));
  return {
    tilesize: 16,
    width: w,
    height: h,
    tilesets: { main: { cols: 8 }, front: { cols: 8 } },
    collision: grid(),
    main: grid(),
    front: grid(),
    entities: [],
  };
}

describe('inBounds', () => {
  it('rejects out-of-range coordinates', () => {
    const level = makeLevel(4, 3);
    expect(inBounds(level, 0, 0)).toBe(true);
    expect(inBounds(level, 3, 2)).toBe(true);
    expect(inBounds(level, -1, 0)).toBe(false);
    expect(inBounds(level, 4, 0)).toBe(false);
    expect(inBounds(level, 0, 3)).toBe(false);
  });
});

describe('paintTile / eraseTile', () => {
  it('writes tile ids into the chosen layer', () => {
    const level = makeLevel(4, 4);
    paintTile(level, 'main', 2, 1, 7);
    expect(level.main[1]?.[2]).toBe(7);
    expect(level.front[1]?.[2]).toBe(0);
  });

  it('always writes 1 to the collision layer', () => {
    const level = makeLevel(4, 4);
    paintTile(level, 'collision', 1, 1, 99);
    expect(level.collision[1]?.[1]).toBe(1);
  });

  it('ignores out-of-bounds writes instead of throwing', () => {
    const level = makeLevel(2, 2);
    expect(() => paintTile(level, 'main', -5, 0, 3)).not.toThrow();
    expect(() => paintTile(level, 'main', 10, 10, 3)).not.toThrow();
  });

  it('erases back to empty', () => {
    const level = makeLevel(4, 4);
    paintTile(level, 'main', 0, 0, 5);
    eraseTile(level, 'main', 0, 0);
    expect(level.main[0]?.[0]).toBe(0);
  });
});

describe('forEachLine', () => {
  it('visits both endpoints and stays connected', () => {
    const seen: string[] = [];
    forEachLine(0, 0, 4, 0, (x, y) => seen.push(`${x},${y}`));
    expect(seen).toEqual(['0,0', '1,0', '2,0', '3,0', '4,0']);
  });

  it('handles steep diagonals without gaps', () => {
    const seen: string[] = [];
    forEachLine(0, 0, 2, 5, (x, y) => seen.push(`${x},${y}`));
    expect(seen[0]).toBe('0,0');
    expect(seen[seen.length - 1]).toBe('2,5');
    // A connected 8-way line between these points needs 6 cells (max(dx,dy)+1).
    expect(seen).toHaveLength(6);
    expect(new Set(seen).size).toBe(6);
  });

  it('handles a single-cell line', () => {
    const seen: string[] = [];
    forEachLine(3, 3, 3, 3, (x, y) => seen.push(`${x},${y}`));
    expect(seen).toEqual(['3,3']);
  });
});

describe('paintLine and paintBox', () => {
  it('paints a horizontal line across the layer', () => {
    const level = makeLevel(6, 6);
    paintLine(level, 'main', 1, 2, 4, 2, 9);
    expect(level.main[2]?.slice(0, 6)).toEqual([0, 9, 9, 9, 9, 0]);
  });

  it('fills an inclusive box regardless of drag direction', () => {
    const level = makeLevel(6, 6);
    paintBox(level, 'front', 4, 3, 2, 1, 4);
    for (let y = 1; y <= 3; y++) {
      for (let x = 2; x <= 4; x++) {
        expect(level.front[y]?.[x]).toBe(4);
      }
    }
    expect(level.front[0]?.[2]).toBe(0);
    expect(level.front[1]?.[5]).toBe(0);
  });

  it('fills the collision layer as solid', () => {
    const level = makeLevel(4, 4);
    paintBox(level, 'collision', 0, 0, 3, 3, 2);
    expect(level.collision.flat().every((v) => v === 1)).toBe(true);
  });
});

describe('entities', () => {
  const fishSize: Size = { w: 32, h: 32 };

  it('centers a placed entity on the click point', () => {
    const level = makeLevel(4, 4);
    const entity = placeEntity(level, 'EntityFish', 100, 50, fishSize);
    expect(entity).toEqual({ type: 'EntityFish', x: 84, y: 34 });
    expect(level.entities).toHaveLength(1);
  });

  it('keeps only one player when placing the player', () => {
    const level = makeLevel(4, 4);
    placeEntity(level, 'EntityPlayer', 20, 20, { w: 32, h: 20 }, true);
    placeEntity(level, 'EntityPlayer', 80, 20, { w: 32, h: 20 }, true);
    expect(level.entities.filter((e) => e.type === 'EntityPlayer')).toHaveLength(1);
  });

  it('deletes the top-most entity under a point', () => {
    const level = makeLevel(4, 4);
    placeEntity(level, 'EntityFish', 100, 50, fishSize);
    placeEntity(level, 'EntityMine', 100, 50, { w: 16, h: 16 });
    const removed = deleteEntityAt(level, 100, 50, () => fishSize);
    expect(removed).toBe('EntityMine');
    expect(level.entities).toHaveLength(1);
  });

  it('returns null when nothing is under the point', () => {
    const level = makeLevel(4, 4);
    expect(deleteEntityAt(level, 10, 10, () => fishSize)).toBeNull();
  });
});
