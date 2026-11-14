/**
 * Player-facing master volume. Engine-free so it can be unit tested; the
 * storage argument keeps it independent of `localStorage` in tests.
 */

const STORAGE_KEY = 'underwater-diving:volume';

/** 0, 10, 20 ... 100 percent. */
export const VOLUME_STEPS = 10;

const DEFAULT_VOLUME = 1;

export interface VolumeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): VolumeStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Some privacy modes throw on access.
    return null;
  }
}

/** Snap to a 10% step and keep the result inside 0..1. */
export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_VOLUME;
  }
  return Math.min(1, Math.max(0, Math.round(value * VOLUME_STEPS) / VOLUME_STEPS));
}

export function loadVolume(storage: VolumeStorage | null = defaultStorage()): number {
  if (!storage) {
    return DEFAULT_VOLUME;
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) {
      return DEFAULT_VOLUME;
    }
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? clampVolume(parsed) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

export function saveVolume(value: number, storage: VolumeStorage | null = defaultStorage()): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(STORAGE_KEY, String(clampVolume(value)));
  } catch {
    // Storage can be full or blocked; the in-memory value still applies.
  }
}

/** One step up or down, clamped at the ends. */
export function stepVolume(current: number, direction: number): number {
  const step = Math.sign(direction) / VOLUME_STEPS;
  return clampVolume(current + step);
}

/** HUD label: `80%`, or `MUTED` at zero. */
export function volumeLabel(value: number): string {
  return value <= 0 ? 'MUTED' : `${Math.round(value * 100)}%`;
}
