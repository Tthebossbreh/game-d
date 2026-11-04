import { describe, expect, it } from 'vitest';
import { FIXED_UPDATE_FPS, STARTER, VIEW } from '../src/game/config';

describe('starter config', () => {
  it('runs the simulation at a fixed 120 Hz step', () => {
    expect(FIXED_UPDATE_FPS).toBe(120);
  });

  it('keeps the ground inside the view', () => {
    expect(STARTER.groundHeight).toBeGreaterThan(0);
    expect(STARTER.groundHeight).toBeLessThan(VIEW.height);
  });

  it('places the whole box within the playable area', () => {
    expect(STARTER.boxHalf * 2).toBeLessThanOrEqual(VIEW.width);
    expect(STARTER.boxHalf * 2).toBeLessThanOrEqual(VIEW.height - STARTER.groundHeight);
  });
});
