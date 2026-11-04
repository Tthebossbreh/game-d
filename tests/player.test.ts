import { describe, expect, it } from 'vitest';
import { PLAYER } from '../src/game/config';
import { PlayerState, type PlayerInput } from '../src/game/player/PlayerState';
import type { Box } from '../src/game/physics/aabb';

const DT = 1 / 120;
const GROUND: Box[] = [{ x: -1000, y: 200, w: 5000, h: 100 }];

function empty(overrides: Partial<PlayerInput> = {}): PlayerInput {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    jumpHeld: false,
    jumpPressed: false,
    boostPressed: false,
    ...overrides,
  };
}

function settle(player: PlayerState, steps = 240): void {
  for (let i = 0; i < steps; i++) {
    player.step(empty(), DT, GROUND);
  }
}

describe('PlayerState', () => {
  it('falls under gravity and lands on the ground', () => {
    const player = new PlayerState(100, 100);
    settle(player);
    expect(player.onGround).toBe(true);
    expect(player.y).toBeCloseTo(200 - PLAYER.height, 0);
  });

  it('jumps when grounded', () => {
    const player = new PlayerState(100, 100);
    settle(player);
    const events = player.step(empty({ jumpPressed: true, jumpHeld: true }), DT, GROUND);
    expect(events.jump).toBe(true);
    expect(player.vy).toBeLessThan(0);
  });

  it('boosts horizontally in the facing direction', () => {
    const player = new PlayerState(100, 100);
    settle(player);
    player.step(empty({ right: true }), DT, GROUND);
    const facing = player.facing;
    const events = player.step(empty({ boostPressed: true }), DT, GROUND);
    expect(events.boost).toBe(true);
    expect(player.isBoosting).toBe(true);
    expect(player.vx).toBeCloseTo(facing * PLAYER.boostSpeed, 0);
  });

  it('takes damage but ignores hits during i-frames', () => {
    const player = new PlayerState(100, 100);
    expect(player.hurt(1, 200)).toBe(true);
    expect(player.health).toBe(PLAYER.maxHealth - 1);
    expect(player.hurt(1, 200)).toBe(false);
    expect(player.health).toBe(PLAYER.maxHealth - 1);
  });

  it('dies once health is exhausted', () => {
    const player = new PlayerState(100, 100);
    for (let i = 0; i < PLAYER.maxHealth; i++) {
      player.invuln = 0;
      player.hurt(1, 200);
    }
    expect(player.health).toBe(0);
    expect(player.dead).toBe(true);
  });

  it('holds jump to swim upward in mid-air', () => {
    const player = new PlayerState(100, 100);
    for (let i = 0; i < 5; i++) {
      player.step(empty(), DT, GROUND);
    }
    const before = player.y;
    for (let i = 0; i < 60; i++) {
      player.step(empty({ jumpHeld: true }), DT, GROUND);
    }
    expect(player.y).toBeLessThan(before);
  });
});
