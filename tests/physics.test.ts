import { describe, expect, it } from 'vitest';
import { containsPoint, overlaps } from '../src/game/physics/aabb';
import { moveAndCollide, type Body } from '../src/game/physics/kinematic';

const GROUND = { x: 0, y: 100, w: 200, h: 16 };

function body(overrides: Partial<Body> = {}): Body {
  return { x: 0, y: 0, w: 16, h: 16, vx: 0, vy: 0, ...overrides };
}

describe('aabb', () => {
  it('detects overlapping boxes', () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });

  it('treats touching edges as separate', () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });

  it('contains points on the boundary', () => {
    const box = { x: 0, y: 0, w: 10, h: 10 };
    expect(containsPoint(box, 10, 10)).toBe(true);
    expect(containsPoint(box, 11, 0)).toBe(false);
  });
});

describe('moveAndCollide', () => {
  it('lands on a solid and reports ground contact', () => {
    const b = body({ x: 40, y: 80, vy: 200 });
    const result = moveAndCollide(b, [GROUND], 0.1);
    expect(result.onGround).toBe(true);
    expect(b.y).toBe(100 - 16);
    expect(b.vy).toBe(0);
  });

  it('stops against a wall', () => {
    const wall = { x: 100, y: 0, w: 16, h: 200 };
    const b = body({ x: 80, y: 0, vx: 300 });
    const result = moveAndCollide(b, [wall], 0.1);
    expect(result.hitX).toBe(true);
    expect(b.x).toBe(100 - 16);
    expect(b.vx).toBe(0);
  });

  it('passes through empty space', () => {
    const b = body({ x: 0, y: 0, vx: 100, vy: 50 });
    const result = moveAndCollide(b, [GROUND], 0.1);
    expect(result.onGround).toBe(false);
    expect(result.hitX).toBe(false);
    expect(b.x).toBeCloseTo(10);
    expect(b.y).toBeCloseTo(5);
  });
});
