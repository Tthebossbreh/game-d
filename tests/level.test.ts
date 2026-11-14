import { describe, expect, it } from 'vitest';
import { LEVEL, buildSolids, findSpawn } from '../src/game/level';

describe('buildSolids', () => {
  it('merges horizontal runs into single rectangles', () => {
    const solids = buildSolids(
      [
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [1, 0, 1, 1],
      ],
      4,
      3,
      16,
    );
    expect(solids).toEqual([
      { x: 16, y: 0, w: 32, h: 16 },
      { x: 0, y: 32, w: 16, h: 16 },
      { x: 32, y: 32, w: 32, h: 16 },
    ]);
  });

  it('keeps empty rows out', () => {
    expect(buildSolids([[0, 0, 0]], 3, 1)).toEqual([]);
  });
});

describe('level 1', () => {
  it('loads the cave dimensions from the level JSON', () => {
    expect(LEVEL.width).toBe(65);
    expect(LEVEL.height).toBe(50);
    expect(LEVEL.tile).toBe(16);
    expect(LEVEL.pixelWidth).toBe(65 * 16);
    expect(LEVEL.pixelHeight).toBe(50 * 16);
  });

  it('carries the horizontal flip mask for the mirrored right wall', () => {
    expect(LEVEL.flipX.length).toBe(LEVEL.height);
    expect(LEVEL.flipX[10]?.[59]).toBe(0);
    expect(LEVEL.flipX[10]?.[64]).toBe(1);
  });

  it('collapses the bitmap into far fewer rectangles', () => {
    expect(LEVEL.solids.length).toBeGreaterThan(0);
    expect(LEVEL.solids.length).toBeLessThan(1600);
  });

  it('marks every collision tile as solid', () => {
    for (const rect of LEVEL.solids) {
      expect(rect.w).toBeGreaterThan(0);
      expect(rect.h).toBe(16);
    }
  });

  it('exposes a player spawn', () => {
    expect(findSpawn(LEVEL, 'player')).toBeDefined();
  });

  it('parses spawns from the level entity markers', () => {
    const kinds = new Set([
      'player',
      'fish',
      'fish-big',
      'fish-dart',
      'mine',
      'mine-small',
      'mine-big',
      'exit',
      'pickup',
    ]);
    expect(LEVEL.spawns.length).toBeGreaterThan(0);
    for (const spawn of LEVEL.spawns) {
      expect(kinds.has(spawn.kind)).toBe(true);
      expect(Number.isFinite(spawn.x)).toBe(true);
      expect(Number.isFinite(spawn.y)).toBe(true);
    }
  });
});
