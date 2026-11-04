/**
 * Central gameplay and presentation tunables. Keep this file free of engine
 * imports so it stays cheap to import from tests and easy to tweak at runtime.
 */

export const VIEW = {
  width: 1280,
  height: 720,
} as const;

export const FIXED_UPDATE_FPS = 120;

export const STARTER = {
  /** Half-size of the bouncing square, in pixels. */
  boxHalf: 28,
  /** Horizontal and vertical speed, in pixels per second. */
  speedX: 240,
  speedY: 170,
  /** Height of the ground strip drawn at the bottom of the view. */
  groundHeight: 48,
} as const;
