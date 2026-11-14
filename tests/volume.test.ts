import { describe, expect, it } from 'vitest';
import {
  VOLUME_STEPS,
  clampVolume,
  loadVolume,
  saveVolume,
  stepVolume,
  volumeLabel,
  type VolumeStorage,
} from '../src/game/audio/volume';

function memoryStorage(initial: Record<string, string> = {}): VolumeStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key]! : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe('clampVolume', () => {
  it('snaps to 10% steps', () => {
    expect(clampVolume(0.44)).toBeCloseTo(0.4);
    expect(clampVolume(0.46)).toBeCloseTo(0.5);
    expect(clampVolume(0.83)).toBeCloseTo(0.8);
  });

  it('keeps the value inside 0..1', () => {
    expect(clampVolume(-2)).toBe(0);
    expect(clampVolume(4)).toBe(1);
  });

  it('falls back to full volume for invalid input', () => {
    expect(clampVolume(Number.NaN)).toBe(1);
  });
});

describe('stepVolume', () => {
  it('moves one step in the requested direction', () => {
    expect(stepVolume(0.5, 1)).toBeCloseTo(0.6);
    expect(stepVolume(0.5, -1)).toBeCloseTo(0.4);
    expect(VOLUME_STEPS).toBe(10);
  });

  it('stops at the ends', () => {
    expect(stepVolume(1, 1)).toBe(1);
    expect(stepVolume(0, -1)).toBe(0);
  });
});

describe('volumeLabel', () => {
  it('shows a percentage, or MUTED at zero', () => {
    expect(volumeLabel(0)).toBe('MUTED');
    expect(volumeLabel(0.8)).toBe('80%');
    expect(volumeLabel(1)).toBe('100%');
  });
});

describe('loadVolume / saveVolume', () => {
  it('round-trips a saved level', () => {
    const storage = memoryStorage();
    saveVolume(0.4, storage);
    expect(loadVolume(storage)).toBeCloseTo(0.4);
  });

  it('defaults to full volume when nothing is stored', () => {
    expect(loadVolume(memoryStorage())).toBe(1);
    expect(loadVolume(null)).toBe(1);
  });

  it('ignores junk values', () => {
    expect(loadVolume(memoryStorage({ 'underwater-diving:volume': 'loud' }))).toBe(1);
    expect(loadVolume(memoryStorage({ 'underwater-diving:volume': '7' }))).toBe(1);
    expect(loadVolume(memoryStorage({ 'underwater-diving:volume': '0.25' }))).toBeCloseTo(0.3);
  });

  it('survives storage that throws', () => {
    const broken: VolumeStorage = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
    };
    expect(loadVolume(broken)).toBe(1);
    expect(() => saveVolume(0.5, broken)).not.toThrow();
  });
});
