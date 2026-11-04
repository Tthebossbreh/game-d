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
  it('loads the cave dimensions from the pack', () => {
    expect(LEVEL.width).toBe(80);
    expect(LEVEL.height).toBe(50);
    expect(LEVEL.tile).toBe(16);
    expect(LEVEL.pixelWidth).toBe(1280);
    expect(LEVEL.pixelHeight).toBe(800);
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

  it('exposes player, enemy, mine and exit spawns', () => {
    expect(findSpawn(LEVEL, 'player')).toBeDefined();
    expect(findSpawn(LEVEL, 'fish')).toBeDefined();
    expect(findSpawn(LEVEL, 'fish-big')).toBeDefined();
    expect(findSpawn(LEVEL, 'fish-dart')).toBeDefined();
    expect(findSpawn(LEVEL, 'mine')).toBeDefined();
    expect(findSpawn(LEVEL, 'mine-small')).toBeDefined();
    expect(findSpawn(LEVEL, 'mine-big')).toBeDefined();
    expect(findSpawn(LEVEL, 'exit')).toBeDefined();
    expect(findSpawn(LEVEL, 'pickup')).toBeDefined();
  });
});
