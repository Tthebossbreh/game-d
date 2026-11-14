import { describe, expect, it } from 'vitest';
import { SCORE } from '../src/game/config';
import { formatMultiplier, timeMultiplier, timeScore } from '../src/game/scoring';

describe('timeMultiplier', () => {
  it('starts at the peak multiplier', () => {
    expect(timeMultiplier(0)).toBe(SCORE.peakMultiplier);
  });

  it('falls to 1x at par and never goes below it', () => {
    expect(timeMultiplier(SCORE.parSeconds)).toBeCloseTo(1, 10);
    expect(timeMultiplier(SCORE.parSeconds * 4)).toBe(1);
  });

  it('gets smaller as the lap gets slower', () => {
    const samples = [0, 5, 15, 30, 45, 60].map((s) => timeMultiplier(s));
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).toBeLessThan(samples[i - 1]!);
    }
  });

  it('treats negative or invalid times as the start of the lap', () => {
    expect(timeMultiplier(-3)).toBe(SCORE.peakMultiplier);
    expect(timeMultiplier(Number.NaN)).toBe(SCORE.peakMultiplier);
    expect(timeMultiplier(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('timeScore', () => {
  it('scales a base award by the current multiplier', () => {
    expect(timeScore(100, 0)).toBe(100 * SCORE.peakMultiplier);
    expect(timeScore(10, SCORE.parSeconds)).toBe(10);
  });

  it('rounds to whole points', () => {
    const half = SCORE.parSeconds / 2;
    const expected = Math.round(5 * timeMultiplier(half));
    expect(timeScore(5, half)).toBe(expected);
    expect(Number.isInteger(timeScore(5, half))).toBe(true);
  });
});

describe('formatMultiplier', () => {
  it('keeps the HUD label a fixed width', () => {
    expect(formatMultiplier(SCORE.peakMultiplier)).toBe('x3.0');
    expect(formatMultiplier(1)).toBe('x1.0');
    expect(formatMultiplier(2.44)).toBe('x2.4');
  });
});
