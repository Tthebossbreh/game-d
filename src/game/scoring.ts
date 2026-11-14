import { SCORE } from './config';

/**
 * Time bonus multiplier. Starts at `SCORE.peakMultiplier` and falls in a
 * straight line to 1x at `SCORE.parSeconds`, then stays at 1x. Every point
 * source (fish, pickups, the exit) runs through this, so a fast lap is worth
 * more than a slow one.
 */
export function timeMultiplier(elapsedSeconds: number): number {
  if (Number.isNaN(elapsedSeconds) || elapsedSeconds <= 0) {
    return SCORE.peakMultiplier;
  }
  const remaining = Math.max(0, 1 - elapsedSeconds / SCORE.parSeconds);
  return 1 + (SCORE.peakMultiplier - 1) * remaining;
}

/** Base award scaled by the time multiplier, rounded to whole points. */
export function timeScore(base: number, elapsedSeconds: number): number {
  return Math.round(base * timeMultiplier(elapsedSeconds));
}

/** HUD label such as `x2.4`; one decimal keeps the width fixed. */
export function formatMultiplier(multiplier: number): string {
  return `x${multiplier.toFixed(1)}`;
}
