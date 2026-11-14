import { describe, expect, it } from 'vitest';
import { EnemyState } from '../src/game/enemies/EnemyState';

const DT = 1 / 120;
const NO_SOLIDS: never[] = [];

describe('EnemyState', () => {
  it('chases a target inside its aggro radius', () => {
    const fish = new EnemyState('fish', 100, 100);
    fish.step(DT, { x: 110, y: 100 }, NO_SOLIDS);
    expect(fish.facing).toBe(1);
    expect(fish.vx).toBeGreaterThan(0);
  });

  it('drifts home when the target is far away', () => {
    const fish = new EnemyState('fish', 0, 0);
    fish.x = 40;
    fish.y = 0;
    fish.step(DT, { x: 5000, y: 5000 }, NO_SOLIDS);
    expect(fish.vx).toBeLessThan(0);
  });

  it('keeps big fish patrolling', () => {
    const big = new EnemyState('fish-big', 100, 100);
    big.step(DT, null, NO_SOLIDS);
    expect(Math.abs(big.vx)).toBeGreaterThan(0);
  });

  it('locks a dart fish onto an aligned target', () => {
    const dart = new EnemyState('fish-dart', 100, 100);
    dart.step(DT, { x: 160, y: 100 }, NO_SOLIDS);
    expect(dart.charging).toBe(true);
    expect(dart.facing).toBe(1);
    expect(dart.vx).toBeGreaterThan(0);
  });

  it('leaves mines motionless', () => {
    const mine = new EnemyState('mine', 100, 100);
    mine.step(DT, { x: 0, y: 0 }, NO_SOLIDS);
    expect(mine.vx).toBe(0);
    expect(mine.vy).toBe(0);
    expect(mine.isMine).toBe(true);
  });

  it('revives a killed fish back at its spawn', () => {
    const fish = new EnemyState('fish', 100, 100);
    fish.x = 40;
    fish.y = 60;
    fish.vx = 12;
    fish.kill();

    fish.revive();

    expect(fish.dead).toBe(false);
    expect(fish.centerX).toBeCloseTo(100);
    expect(fish.centerY).toBeCloseTo(100);
    expect(fish.vx).toBe(0);
    expect(fish.vy).toBe(0);
    expect(fish.facing).toBe(1);
  });

  it('re-arms a charging dart fish and restores mines', () => {
    const dart = new EnemyState('fish-dart', 100, 100);
    dart.step(DT, { x: 160, y: 100 }, NO_SOLIDS);
    expect(dart.charging).toBe(true);

    dart.revive();

    expect(dart.dead).toBe(false);
    expect(dart.charging).toBe(false);
    expect(dart.facing).toBe(1);

    const mine = new EnemyState('mine-small', 300, 200);
    mine.kill();
    mine.x = 10;
    mine.revive();
    expect(mine.dead).toBe(false);
    expect(mine.centerX).toBeCloseTo(300);
    expect(mine.centerY).toBeCloseTo(200);
  });
});
